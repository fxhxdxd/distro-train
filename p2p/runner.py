import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from prompt_toolkit import PromptSession

session = PromptSession()
import multiaddr
import trio
from coordinator import (
    COMMANDS,
    FED_LEARNING_MESH,
    Node,
)
from libp2p.peer.peerinfo import (
    info_from_p2p_addr,
)
from libp2p.tools.async_service.trio_service import (
    background_trio_service,
)
from libp2p.utils.address_validation import (
    find_free_port,
)

from logs import setup_logging

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = setup_logging("runner")

# ── CLI argument parsing ───────────────────────────────────────────────────────
# Priority: CLI flag > environment variable (.env already loaded above) > prompt
#
# Each trainer node should have its own Hedera account. Use --operator-id and
# --operator-key to supply per-node credentials without editing .env files.
#
# Key format for --operator-key (backend / DER-encoded):
#   3030020100300706052b8104000a04220420<32-byte-raw-hex>
# This differs from the frontend VITE_OPERATOR_KEY which is raw hex only.
# See README.md "Hedera Operator ID & Key Configuration" for details.

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a distro-train P2P node",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  bootstrap node (uses .env defaults):
    python runner.py --role bootstrap

  client node:
    python runner.py --role client

  trainer with a dedicated Hedera account (no .env editing needed):
    python runner.py --role trainer \\
        --operator-id 0.0.12345 \\
        --operator-key 3030020100300706052b8104000a04220420<32-byte-hex>
        """,
    )
    parser.add_argument(
        "--role",
        choices=["bootstrap", "client", "trainer"],
        help="Node role — skips the interactive role prompt",
    )
    parser.add_argument(
        "--operator-id",
        dest="operator_id",
        metavar="HEDERA_ACCOUNT",
        help="Hedera Operator ID, e.g. 0.0.12345 — overrides OPERATOR_ID in .env",
    )
    parser.add_argument(
        "--operator-key",
        dest="operator_key",
        metavar="DER_HEX",
        help="Hedera Operator Key (DER-encoded hex) — overrides OPERATOR_KEY in .env",
    )
    return parser.parse_args()


_CLI = _parse_args()

# Values loaded from .env (already applied by load_dotenv above)
_ENV_OPERATOR_KEY = os.getenv("OPERATOR_KEY", "")
_ENV_OPERATOR_ID = os.getenv("OPERATOR_ID", "")


async def interactive_shell() -> None:

    # ── Role ──────────────────────────────────────────────────────────────────
    if _CLI.role:
        role = _CLI.role
    else:
        role = await trio.to_thread.run_sync(
            lambda: input(
                "Configure the role of the node client/trainer/bootstrap [default: bootstrap]: "
            )
        )
        role = role.strip() or "bootstrap"

    # ── Operator Key: CLI > .env > prompt ─────────────────────────────────────
    operator_key = _CLI.operator_key or _ENV_OPERATOR_KEY
    if not operator_key:
        operator_key = await trio.to_thread.run_sync(
            lambda: input("Enter the operator key (DER-encoded hex): ")
        )
        operator_key = operator_key.strip()

    # ── Operator ID: CLI > .env > prompt ──────────────────────────────────────
    operator_id = _CLI.operator_id or _ENV_OPERATOR_ID
    if not operator_id:
        operator_id = await trio.to_thread.run_sync(
            lambda: input("Enter the operator id (e.g. 0.0.12345): ")
        )
        operator_id = operator_id.strip()

    # ── Warn if trainer is using the shared default account ───────────────────
    if role == "trainer" and operator_id == _ENV_OPERATOR_ID and not _CLI.operator_id:
        logger.warning(
            "Trainer node is using the default .env Operator ID (%s). "
            "Each trainer should have its own Hedera account for correct "
            "weight attribution and independent reward payments. "
            "Re-run with: --operator-id 0.0.XXXX --operator-key 3030...",
            operator_id,
        )

    node = Node(
        role=role,
        operator_key=operator_key or _ENV_OPERATOR_KEY,
        operator_id=operator_id or _ENV_OPERATOR_ID,
    )
    node.mesh.fed_mesh_id = FED_LEARNING_MESH

    logger.info(f"Running as {node.role.upper()} node")

    # Initiate the node

    localhost_ip = "0.0.0.0"
    if node.role == "bootstrap":
        port = 8000
    else:
        port = find_free_port()

    listen_addr = multiaddr.Multiaddr(f"/ip4/{localhost_ip}/tcp/{port}")

    async with (
        node.host.run(listen_addrs=[listen_addr]),
        trio.open_nursery() as nursery,
    ):
        nursery.start_soon(node.host.get_peerstore().start_cleanup_task, 60)
        logger.debug(f"Host multiaddr: {node.host.get_addrs()[0]}")

        logger.debug("Initializing Pubsub and Gossipsub...")
        async with background_trio_service(node.pubsub):
            async with background_trio_service(node.gossipsub):
                await trio.sleep(1)
                await node.pubsub.wait_until_ready()
                logger.info("Pubsub and Gossipsub services started !!")

                nursery.start_soon(node.command_executor, nursery)
                nursery.start_soon(node.connected_peer_monitoring_loop)
                nursery.start_soon(node.periodic_mesh_summary_update)
                nursery.start_soon(node.api_server)
                await trio.sleep(1)

                # TODO: There will be a bootstrap node, of the whole fed-learn mesh
                # and the client will first connect to that node and the fed-learn mesh
                # and then the training topic will be broadcasted in that particular mesh

                if node.role == "bootstrap":
                    # Subscribe to the FED_LEARNING_MESH
                    boot_subscripton = await node.pubsub.subscribe(FED_LEARNING_MESH)
                    nursery.start_soon(node.receive_loop, boot_subscripton)
                    node.subscribed_topics.append(FED_LEARNING_MESH)

                    # Flood the bootstrap mesh summary in the FED_LEARNING_MESH periodically
                    nursery.start_soon(
                        node.periodic_flood_bootstrap_mesh_summary, FED_LEARNING_MESH
                    )

                    await trio.sleep(1)
                    logger.info(
                        f"{node.role.upper()} node subscribed to the [{FED_LEARNING_MESH}] mesh"
                    )

                if node.role != "bootstrap":
                    # Now we connect to the bootstrap node, and join in the fed-learn pubsub mesh
                    bootstrap_addr = os.getenv("BOOTSTRAP_ADDR")
                    if not bootstrap_addr:
                        raise RuntimeError(
                            "BOOTSTRAP_ADDR is not set. A client/trainer node needs the "
                            "bootstrap node's full multiaddr (…/tcp/<port>/p2p/<peer-id>) "
                            "in your .env before it can join the mesh."
                        )
                    maddr = multiaddr.Multiaddr(bootstrap_addr)
                    info = info_from_p2p_addr(maddr)

                    node.bootstrap_addr = info.addrs[0]
                    node.bootstrap_id = info.peer_id

                    # A failed dial to the bootstrap must NOT tear down the whole node
                    # (host, pubsub, gossipsub, API server). Retry with backoff; if it
                    # still fails, log one actionable line and keep running so the node
                    # stays usable and can join the mesh once a peer becomes reachable.
                    connected = False
                    for attempt in range(1, 6):
                        try:
                            await node.host.connect(info)
                            connected = True
                            logger.info("Connected with the BOOTSTRAP node")
                            break
                        except Exception as exc:
                            logger.warning(
                                f"Bootstrap connect attempt {attempt}/5 failed: "
                                f"{exc.__class__.__name__}: {exc}"
                            )
                            await trio.sleep(2 * attempt)

                    if not connected:
                        logger.error(
                            "Could not reach the bootstrap node at %s after 5 attempts; "
                            "continuing without it (node is up but NOT in the mesh yet). "
                            "Check that: (1) the /p2p/<peer-id> in BOOTSTRAP_ADDR matches "
                            "the running bootstrap's key, (2) nothing else is bound to that "
                            "host:port, (3) the bootstrap node is actually running.",
                            bootstrap_addr,
                        )

                    # Subscribe to the fed-learn mesh
                    worker_subscription = await node.pubsub.subscribe(FED_LEARNING_MESH)
                    logger.info(
                        f"{node.role.upper()} node subscribed to the [{FED_LEARNING_MESH}] mesh"
                    )
                    nursery.start_soon(node.receive_loop, worker_subscription)
                    node.subscribed_topics.append(FED_LEARNING_MESH)

                    await trio.sleep(1)

                nursery.start_soon(node.status_greet)
                logger.info("Entering interactive mode. Type commands below.")
                logger.debug(COMMANDS)

                while not node.termination_event.is_set():
                    try:
                        _ = await trio.to_thread.run_sync(input)
                        user_input = await trio.to_thread.run_sync(
                            lambda: session.prompt("Command> ")
                        )
                        cmds = user_input.strip().split(" ", 2)
                        await node.send_channel.send(cmds)

                    except Exception as e:
                        logger.error(f"Error in the interactive shell: {e}")
                        await trio.sleep(1)

    logger.info("Shutdown complete, Goodbye!")


if __name__ == "__main__":

    try:
        trio.run(interactive_shell)
    except* KeyboardInterrupt:
        logger.critical("Session terminated by the user")
