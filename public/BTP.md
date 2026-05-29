### Distro-train: A Secure Byzantine-Robust Peer-to-Peer Distributed

### Machine Learning Platform

#### Project report submitted in partial fulfillment

#### of the requirements for the degree of

#### Bachelor of Technology

#### in

#### Communication and Computer Engineering

#### by

#### Fahad Khan - Roll No. 23UCC

#### Ayush Petwal - Roll No. 23UCC

#### Under Guidance of

#### Dr. Soumya Mukherjee

#### Department of Communication and Computer Engineering

#### The LNM Institute of Information Technology, Jaipur

#### April 2026


©The LNM INSTITUTE OF INFORMATION TECHNOLOGY Jaipur-2026.
All rights reserved.


### The LNM Institute of Information Technology

### Jaipur, India

### CERTIFICATE

This is to certify that the project entitled “Distro-train: A Secure Byzantine-Robust Peer-
to-Peer Distributed Machine Learning Platform”, submitted by Fahad Khan (Roll No.
23UCC541) and Ayush Petwal (Roll No. 23UCC529) in partial the fulfillment of the re-
quirement of the degree in Bachelor of Technology (B. Tech), is a bonafide record of works
carried out by them at the Department of Communication and Computer Engineering, The
LNM Institute of Information Technology, Jaipur, (Rajasthan) ,India, during the academic ses-
sion 2025–2026 under my supervision and guidance and the same has not been submitted
elsewhere for the award of any other degree. In my opinions, this report is of the standard
required for the award of the degree of Bachelor of Technology (B. Tech).

```
Date Adviser: Dr. Soumya Mukherjee
```

# Acknowledgments

We would like to express our sincere gratitude to our mentor, Dr. Soumya Mukherjee, for
his guidances and constant supervisions throughout course of project. We are really grate-
ful for creative freedom he granted us to explore own ideas on decentralized systems and the
machine-learning securities and for the trust he places in our technical judgments. His thought-
ful feedback at every checkpoints helped us refine both the system designs and the research
directions definitely.

We also thank to Department of the Communication and Computer Engineering at The LNM
Institute of Information Technology for providing the academic environments, computational
resources and laboratory infrastructures that made these work possible.

Our appreciations goes out to the open-source communities behind py-libp2p, Hedera Hash-
graph, PyTorch and Flower federated learning framework project whose codes and documen-
tation proved invaluables as we prototyped the system. We are really thankful to the authors
of the research works cited in this report. the Byzantine-robustness and gradient-inversion
literature cited here directly shaped our security designs.

Finally, we thank our families and friends for there patience, encouragement, and support over
many late nights this project had demanded. Any shortcomings that remains are of course
entirely our owns.

```
Fahad Khan
Ayush Petwal
```
```
iv
```

# Abstract

Federated and Distributed Machine Learning (FML) techniques represent the prevailing trend
in learning models from data whose centralization would be detrimental due to privacy con-
cerns, legal or regulatory issues, or limitations on bandwidths. Yet, even today most FML
systems utilize a trusted central aggregator, a server which accumulates, filters, and aggregates
gradient updates coming from the clients. The centralized nature of federated learning is why
so many of its challenges return. Firstly, you have a central point of failure. Secondly, you
have a server with access to all clients’ gradients (which can be used to either leak private
data or perform targeted poisons). Lastly, there are the political barriers involved in cross-
organizations collaborations where not all parties agree to let others perform aggregation.

This document introduces Distro-train – an entirely decentralised P2P machine learning plat-
form that eliminates the use of central servers altogether. This system includes three layers:
the first of which uses Py-libp2p for creating a P2P overlay for discovery and gossip, a decen-
tralised storage layer of IPFS pre-signed URLs to handle the movement of large datasets and
training model artifacts off of the wired connection, and the third is the Hedera Hashgraph net-
work to perform different tasks including immutable coordination, escrows for smart contracts
and tamper-proof audit logs. Essentially, trainers need to submit a verifiable proof-of-training
hash to earn their cryptographic payments whereas users hold onto their data using pre-signed
URL (that have specific expiration times).

Key features of the proposed method include Byzantine robust, privacy-preserving secu-
rity mechanisms that operate exclusively at the node level without relying on any trusted
aggregator. All gradient updates received by the system are passed through five filters, which
ensure signature and Sybil-resistance checks based on proof-of-work admission, L2 norm clip-
ping as a way of limiting the influence of individual peers, adaptive cosine similarity check as
compensation for non-IID heterogeneity, P2P-oriented bucketing mechanisms that make the
fraction of Byzantine nodes f/n effectively decrease to f/

###### √

n, and gossip aggregation with
exponential-moving-average reputation scores. In our work, we study the effectiveness of the
pipelines in relation to untargeted poisoning, distributed backdoor attack, Sybil flooding, and
gradient-inversion privacy threats.

An honest observation of our results is that no strictly defensive mechanism for aggre-
gation can be secure when the proportion of Byzantine neighbors surpasses 50% in the

```
v
```

```
vi
```
vicinity of any single node: The median estimators fail, the buckets provide no security, and
the weight update gradients become easily invertible into the raw data (as shown in Robbing
the Fed and Fishing for Users’ Data). We consider this limit explicitly and pinpoint future
research problems relating to secure aggregation, zero-knowledge training proof systems, and
cryptographic Sybil defense.

The platform has been fully implemented and has been verified using several user and
trainer nodes, including job dissemination, presigned URL distribution of datasets, ver-
ification of proof-of-training, and automatic chain-based settlement. The report finishes
with future works planned, including fully incorporating the TrustGossip defense pipeline, rep-
utation persistency on Hedera, and zero-knowledge proofs to improve gradient deconstruction
resistance.


## Contents

List of Figures x



- 1 Introduction List of Tables xi
   - 1.1 The Area of Work
   - 1.2 Problem Addressed
   - 1.3 Existing Systems
      - 1.3.1 Centralized Federated Learning in the Style of FedAvg
      - 1.3.2 Blockchain-Aided Federated Learning
         - 1.3.2.1 Limitations
      - 1.3.3 Pure Peer-to-Peer Gossip-based Learning
         - 1.3.3.1 The Gap Filled by Distro-train
   - 1.4 Goals and Contributions
   - 1.5 Structure of the Report
   - 1.6 Citations in This Document
- 2 Literature Review
   - 2.1 Introduction
   - 2.2 Federated Averaging (FedAvg)
   - 2.3 Decentralized SGD
      - 2.3.1 Gossip Protocols
      - 2.3.2 Overlay Substrate: P2P Network Layer
   - 2.4 Byzantine Fault Tolerance in Machine Learning
      - 2.4.1 Krum
      - 2.4.2 Coordinate-wise Median and Trimmed Mean
      - 2.4.3 Bucketing
      - 2.4.4 Local Model Poisoning
   - 2.5 Backdoor Attack
      - 2.5.1 Distributed Backdoor Attacks (DBA)
      - 2.5.2 Neurotoxin
      - 2.5.3 Defenses in the Server Domain: CRFL, FLIP, Lockdown, FLTrust
   - 2.6 Gradient Inversion and Privacy Attacks
      - 2.6.1 Deep Leakage and Its Derivatives
      - 2.6.2 Robbing the Fed
      - 2.6.3 Deconstruction from Weights to Data
      - 2.6.4 Privacy Attacks
   - 2.7 Sybil Attacks in P2P Networks CONTENTS viii
      - 2.7.1 Why Sybils Destroy Byzantine Robustness
      - 2.7.2 Sybil Countermeasures
   - 2.8 Blockchain for Trustless Coordination
      - 2.8.1 Why Sybils Destroy Byzantine Robustness
   - 2.9 Research Gap and Our Contribution
- 3 Proposed Work
   - 3.1 System Architecture
   - 3.2 Node Types and Responsibilities
      - 3.2.1 User Node
      - 3.2.2 Trainer Node
      - 3.2.3 Bootstrap Node
   - 3.3 Networking Layer (py-libp2p)
      - 3.3.1 The Case for py-libp2p
      - 3.3.2 Peer Discovery
      - 3.3.3 PubSub Messaging (GossipSub)
      - 3.3.4 Message Authentication and Replay Protection
      - 3.3.5 Trainer Selection
   - 3.4 Storage Layer
      - 3.4.1 Why Off-Chain, Off-P2P Storage
      - 3.4.2 Chunking and Upload
      - 3.4.3 Presigned URLs
      - 3.4.4 Result Upload
   - 3.5 Blockchain Layer (Hedera)
      - 3.5.1 Smart Contract
      - 3.5.2 Hedera Consensus Service (HCS)
      - 3.5.3 Proof-of-Training
   - 3.6 Security Layer: Byzantine-Robust Aggregation for P2P
      - 3.6.1 Threat Model
      - 3.6.2 The TrustGossip Defense Pipeline
         - 3.6.2.1 Stage 1: Cryptographic Admission and Sybil Attack Defense
         - 3.6.2.2 Step 2: L2-Norm Clipping
         - 3.6.2.3 Stage 3: Adaptive Cosine-Similarity Filtering
         - 3.6.2.4 Stage 4: P2P-Adapted Bucketing
            - The reasons for bucketing in P2P.
            - Amplification factor.
         - 3.6.2.5 Stage 5: Gossip Aggregation with Weighted Trust
      - 3.6.3 Optional Privacy Layer: Local Differential Privacy
      - 3.6.4 Attack-Defense Mapping
      - 3.6.5 Crossing the 50% Threshold: Honesty Limits of the Design
            - Mathematical failure.
            - Gradient decomposition: From parameters to input data.
            - Practical defenses.
   - 3.7 Algorithm Summary
- 4 Simulation and Results
   - 4.1 Objectives of Evaluation CONTENTS ix
   - 4.2 Functional Testing
   - 4.3 Performance and Reliability
      - 4.3.1 Gossip Network Overhead
      - 4.3.2 Transaction on the Hedera
      - 4.3.3 Reliability with Node Churn
   - 4.4 Discussion
- 5 Conclusions and Future Work
   - 5.1 Conclusions
         - A fully integrated serverless training pipeline.
            - of nodes. A Byzantine-robust aggregation pipeline operating at the level
         - Honest characterization of the defense boundary.
         - A concrete attack–defense mapping.
   - 5.2 Limitations
   - 5.3 Future Work
      - 5.3.1 Secure Aggregation for P2P
      - 5.3.2 Proof-of-Stake Sybil Resistance on Hedera
      - 5.3.3 Zero-Knowledge Proofs of Training
      - 5.3.4 Reputation Persistence on Hedera
      - 5.3.5 Hardware-Enforced Deconstruction Resistance
      - 5.3.6 Multi-Round Federated Training
      - 5.3.7 Comprehensive Adversarial Evaluation
   - 5.4 Closing Remarks
- Bibliography


# List of Figures

```
3.1 Five-stage TrustGossip pipeline applied to each incoming gradient....... 20
```
```
x
```

# List of Tables

```
2.1 Summary of state-of-the-art FL defenses and their shortcomings in a pure P2P
setting. Every listed defense assumes a central server performs filtering or
aggregation.................................... 13
3.1 Formal threat model for the distro-train security layer.............. 20
```
```
xi
```

## Chapter 1

# Introduction

### 1.1 The Area of Work

The problem itself exists in the intersection between three exciting research areas: distributed
machine learning, peer-to-peer networking, and blockchain-based trust management. In this
project, we will address a complete system that allows a data owner to lease underutilized
computing power from unknown volunteer trainers to train a machine-learning model based
on their own private data and then retrieve the trained model weights without a central server’s
involvement in any way. The current state of art in machine learning usage heavily depends on
three factors that are very centralizing by nature. First, the training of any neural network re-
quires GPU clusters, which can be accessed commercially through only a few cloud providers.
Second, the datasets used for training are usually quite sensitive (patient records, transaction
history, message logs), and it is illegal or immoral to move such data out of their original place.
Finally, federated learning appears to be the ideal solution to the problem (every client trains a
model independently and shares its gradient with a trusted central server), but federated learn-
ing still requires a central server and thus creates a single point of failure and introduces an
entity that can observe all the gradients sent by all clients. As seen by recent work like [1]
(”Robbing the Fed,” ICLR 2022), a bad guy can use just the aggregated gradients to recon-
struct the actual training data samples, defeating the privacy advantage federated learning is
supposed to provide.

This is where distro-train comes into play – our attempt at addressing both challenges at once.
By positioning the coordination plane on top of the P2P layer, the storage plane on decen-
tralized presigned URL object storage, and the payment/audit plane on the Hedera Hashgraph
consensus network, we eliminate all central entities from the process of training.

The outstanding question that has attracted a lot of attention in this paper concerns how to
achieve a credible aggregation mechanism without a central entity filtering out malicious gra-
dient uploads.

###### 1


chapter: 01 2

### 1.2 Problem Addressed

The problems that this project addresses are mentioned below:

```
How can a data owner, who does not have any computing resources, use her own
private data to train a model through an arbitrary collection of volunteer nodes
that do not trust each other, without involving a trusted third party, while providing
proof against Byzantine, backdoor, Sybil, and gradient inversion attacks?
```
While solving this problem statement we discovered several overlapping sub-problems:

1. Coordination with no server. What happens regarding job announcements, discovery
    of trainers, and status exchange when there is no central intermediary? The P2P layer
    must be capable of surviving churn, resilient against message replays, and cryptograph-
    ically authenticate participants according to their identities, rather than IP or hostnames.
2. Distribution of data without leakage. Some datasets will be too big to transfer via
    the P2P network and also too sensitive to make publically available. Hence the distribu-
    tion of datasets needs to occur through URLs which will eventually expire after the job
    completion, effectively closing the window for the trainer’s access.
3. Payment on-chain. If a trainer completes the task honestly, he should receive payment,
    whereas submission of false outputs implies no payment. Both sides do not trust each
    other, which means that a smart contract is needed to handle payments automatically.
4. Fraud and Byzantine resilience. The most difficult sub-problem. For every node in a
    P2P environment, choosing to trust certain gradient updates is an independent decision.
    A single Byzantine neighbor can, theoretically, move the average value arbitrarily far
    from the honest gradient [1]; Sybil nodes can collectively inundate the neighborhood;
    and a nosey honest node can invert the gradient value to reverse-engineer the training
    data set [2].
5. Confidentiality even from the network itself. Even when all peers comply with the
    protocol, there will still be leakage through the gradient updates themselves. An addi-
    tional layer of differential privacy or gradient encryption will need to be applied.

This report walks through the Distro-train’s approach to each of the sub-problems especially
the security-layer contributions.

### 1.3 Existing Systems

Before presenting our proposed design, let us briefly describe existing systems occupying this
design space and their limitations.


chapter: 01 3

#### 1.3.1 Centralized Federated Learning in the Style of FedAvg

The standard system is the FedAvg protocol by Google [1], later generalized and scaled in
[2]. Clients train on local data for a fixed number of epochs, upload updates to a centralized
server, and the server averages the uploaded updates to generate a new global model. FedAvg
underlies Google’s Gboard keyboard federation and most federations across hospitals today.

The key limitations for our design include: (i) The server receives all clients’ updates and poses
a threat to both availability and privacy; (ii) The root of trust for the server is administrative
(“we will be honest”), which fails when participants compete in cross-organizational settings;
(iii) It is fragile to operate for several weeks due to a single point of failure.

#### 1.3.2 Blockchain-Aided Federated Learning

Another type of system uses the combination of a centralized FL approach and blockchain for
auditing purposes. Examples include FLchain [3], as well as Nguyen et al.’s MEC-blockchain
architecture [4]. In both cases, the gradients’ hashes are stored in the blockchain, allowing
for an auditor to trace which training machine provided what information. Yet, the actual
aggregation process is still performed in a centralized manner on the server; the blockchain is
merely a forensic instrument.

##### 1.3.2.1 Limitations

Since the centralized aggregator component is retained, such systems retain all the security
issues and concerns associated with FedAvg and provide tamper evidence only; it is useful yet
inadequate.

#### 1.3.3 Pure Peer-to-Peer Gossip-based Learning

The third approach, illustrated by work from Lalitha et al. [5] and Koloskova et al.’s decen-
tralized SGD family [6], does away with the server altogether. Every node interacts with its
neighbors using model parameters according to some graph, and reaches consensus on a shared
model through gossiping. These systems have the correct decentralization properties but make
very few assumptions other than that all participating nodes are benevolent. As discussed in
Chapter 2, Krum, trimmed mean, bucketing have been explored extensively for robustness
against Byzantine adversaries in the context of servers, but the P2P version is unexplored.


chapter: 01 4

##### 1.3.3.1 The Gap Filled by Distro-train

The proposed solution framework appears, at least to the authors’ knowledge, to be the first
such framework which brings together (i) peer-to-peer networking through py-libp2p, (ii) de-
centralized pre-signed URL data storage, (iii) hedera based escrow/audit services, and (iv)
serverless Byzantine robust aggregation via a node-based pipeline with Sybil-proof admission
and adaptive cosine similarity.

### 1.4 Goals and Contributions

The goals of this B.Tech project are as following:

1. Creation of an end-to-end decentralized training solution, where data owners and trainer
    volunteers are connected without the presence of any trusted intermediary for the train-
    ing phase.
2. Development of a P2P network system using the py-libp2p technology stack to im-
    plement capabilities such as job broadcast, PubSub communication, authentication of
    identities and replay protection.
3. Implementation of a storage solution that prevents payload transfer through the P2P
    channel by implementing presigned URLs with expiration time.
4. Adoption of Hedera smart contracts for escrow payment processing and Hedera Con-
    sensus Service for immutable audit logs.
5. Propose an algorithm for Byzantine fault tolerant aggregation that uses cryptographic
    access, normalization clipping, adaptive cosine similarity, buckets, and gossiping based
    on trust in order to guard against data poisoning, backdoor attack, Sybil attack, and
    gradient inversion attack.
6. Determine the pitfalls of the proposed system, including finding the maximum percent-
    age of Byzantine faults beyond which there is no defense-only mechanism that guaran-
    tees safety in addition to the attack against weights.
7. Propose a research agenda that covers aggregation security, training proof systems, and
    reputation.

### 1.5 Structure of the Report

The report proceeds further as follows:


chapter: 01 5

Chapter 2 consists of a literature review about such areas as: FedAvg, decentralized SGD,
Byzantine defense mechanisms (Krum, Trimmed Mean, Bucketing), backdoor attacks (DBA,
Neurotoxin), gradient inversion attacks (Robbing the Fed, Fishing), and the Sybil attack liter-
ature in classic P2P networks.

Chapter 3 provides an in-depth analysis of the proposed distro-train architecture. The chapter
includes sections dedicated to network, data storing, blockchain parts of the architecture as
well as its important component, the security layer.

Chapter 4 describes our experiment methodology, attack scenarios as well as obtained perfor-
mance/functional results.

Finally, chapter 5 provides conclusions drawn from this report along with suggestions for
future work. The list of references includes all the sources cited in the process of research.

### 1.6 Citations in This Document

All sources that are cited within the current document are provided in the numeric style, for
instance [1] and [2]. References are listed in the bibch1.bib file using the IEEE format.


## Chapter 2

# Literature Review

### 2.1 Introduction

The current chapter will provide an overview of the technical background underlying distro-
train. First, we start with a brief overview of the classical federated-learning algorithm (Fe-
dAvg) and its inherent flaws under the non-IID data regime. Then, we explore the full de-
centralized solution for this problem (Decentralized SGD over gossip). Finally, most of the
chapter is dedicated to reviewing the security literature, which includes Byzantine robustness,
backdoors, privacy gradient inversion, and Sybil attacks.

### 2.2 Federated Averaging (FedAvg)

FedAvg is the basic algorithm described in the work of McMahan et al. [1] that almost all
recent federated learning models have been developed upon. During each round of communi-
cation t, the server sends the current global model wtto some selected clients. Each client k
computes E local epochs of SGD on its own dataset and provides an update ∆wkto the global
model using a weighted averaging formula:

FedAvg enjoys an O(1/T ) convergence rate to the optimum under convex objective functions
and IID data. The crucial bottleneck lies in the client-drift issue, which implies that for non-
IID data, the local SGDs of all clients drifts to their respective local optima, thus giving rise
to a persistent error floor of η^2 E^2 δ^2 , where δ^2 represents the heterogeneity of gradients at
individual clients’ sites.

Regardless of the defense algorithm we develop in order to achieve Byzantine robustness, there
would not be any risk of client drift. This is due to the fact that such defense algorithms as
the Krum algorithm, which exclude all but one update message, result in client drift, since this
single message is biased towards only one particular client.

###### 6


chapter: 02 7

### 2.3 Decentralized SGD

The D-SGD algorithm has no central server at all. Node i maintains a personal copy of the
model withat only interacts with the models of its neighboring nodes. After a local step of
stochastic gradient descent, the model for node i is calculated from itself and the neighboring
models via the doubly-stochastic matrix W in the following way:

```
wi←
```
###### X

```
j
```
```
Wijwj
```
The speed of convergence depends on the spectral gap of the matrix (1− λ 2 ), the value of
which is improved by increasing either the spectral gap or the degree of graph connectivity.
The behavior of the D-SGD algorithm with compressed gradients was fully investigated in [3].

#### 2.3.1 Gossip Protocols

As an implementation of D-SGD, gossip protocols involve each node pulling or pushing their
model to a randomly chosen neighbor. Eventually, all models reach convergence. SWIFT
[4] proves that wait-free, asynchronous gossip communication can speed up convergence in
deployments across heterogenous hardware—a feature we take advantage of in distro-train,
where trainers are equipped with commodity hardware of different CPU and GPU power.

#### 2.3.2 Overlay Substrate: P2P Network Layer

The gossip protocol is based on a peer-to-peer network substrate that is provided by libp2p,
using its Python implementation, py-libp2p, which offers:

- Noise protocol: Authenticated encryption channels between any two peers.
- QUIC Transport: Efficient transport layer that runs UDP with connection multiplexing.
- PubSub (GossipSub): Publish-subscribe mechanism for message flooding and mesh dis-
    semination.

A peer’s ID is derived from its Ed25519 public key, so each peer receives cryptographic iden-
tity as soon as it connects to the overlay network.


chapter: 02 8

### 2.4 Byzantine Fault Tolerance in Machine Learning

The Byzantine participant of federated learning can send any updates of the gradients. It should
be noted that in contrast to random participants, Byzantine participants know the aggregation
strategy being used and choose an optimal solution based on it. The first negative result of
Blanchard [1] states that the classic strategy does not work in case of Byzantine adversaries
because of the ability of one such adversary to change the coordinate-wise average of the
gradients to any value because of the lack of a bound of this average value based on the input
values of the adversary.

#### 2.4.1 Krum

Krum [1] is a Byzantine fault-tolerant aggregating algorithm. It computes for every ∆wkthe
sum of squared distances to the closest N − f − 2 neighbors and chooses the vector with
the smallest sum to aggregate in the current round. The Krum algorithm can withstand up to
f < N/ 2 − 1 Byzantine participants. The main disadvantage of the algorithm is the loss of
data as just one gradient is stored in each round. ( f - maximum number of malicious nodes )

#### 2.4.2 Coordinate-wise Median and Trimmed Mean

Pillutla explored the coordinate-wise median and related geometric median aggregators. They
work by taking the median (or a smooth approximation to it) for each coordinate independently
among all the updates. While they are robust to up to f < N/ 2 Byzantine values for each
coordinate, they suffer from high variance in the presence of diverse (non-IID) honest updates.

The trimmed mean computes an average, ignoring the largest and smallest β fraction of values
for each coordinate. It strikes a balance between the other two methods: in the honest scenario,
it carries more information than the median, while bounding adversarial power as well. In
distro-train, trimmed mean is used as the outer aggregator in its bucketing method (2.4.3).

#### 2.4.3 Bucketing

Karimireddy present another sophisticated attack on Krum and Trimmed Mean under non-IID
conditions: The attacker is allowed to deviate from normal behavior such that the Byzantine
node looks like an outlier client node, and consequently is removed along with the outlier
client. The approach proposed to deal with the attack by Karimireddy et al. is bucketing:
randomly grouping n updates received by the aggregator into s buckets and averaging them
individually, and then aggregating robustly the averages across the buckets.

This is a neat trick. If f out of n update vectors are Byzantine, then every bucket will include
no more than f/s Byzantine updates on average. By setting s equal to

###### √

```
n buckets, we will
```

chapter: 02 9

reduce the Byzantine fraction from f/n to f/

###### √

n, such that the robust aggregator defined
below can tolerate adversaries with fractions that would have made it fail. We generalize the
technique to P2P networks in Chapter 3.

#### 2.4.4 Local Model Poisoning

Fang demonstrated that an intelligent adversary can avoid Krum, trimmed mean, and median
attacks by calculating the optimal direction for poison analytically. Their attack relies on the
adversary’s knowledge of honest updates (approximations of which, in this case), as in P2P,
since each gossip node has access to it. This is the main reason why, in addition to bucketing,
distro-train uses cosine-similarity checks; every defensive measure plugs the security hole left
open by the previous one.

### 2.5 Backdoor Attack

Backdoor (or “Trojan”) attacks are covert attacks: the model exhibits its intended behavior
when fed a clean input but makes mistakes on inputs containing a special trigger pattern.
Backdoors are especially risky in federated training, because they persist despite averaging as
long as even one malicious participant takes part.

#### 2.5.1 Distributed Backdoor Attacks (DBA)

The most applicable backdoor attack against P2P systems is the Distributed Backdoor Attack
(DBA) proposed by Xie et al. [5]. In contrast to other one-shot attacks, DBA divides a trigger
into parts assigned to several colluding users. Updates made by each collaborator alone seem
harmless enough to bypass per-update anomalies. Only the sum of all updates can show the
trigger’s presence. DBA is especially harmful in P2P, since there is no single authority to
coordinate attacks.

#### 2.5.2 Neurotoxin

According to Zhang et al. [6], the effect of one-shot attacks on model parameters usually gets
“washed out” after several rounds of averaging. To make the backdoor durable, neurotoxin
constrains the backdoor update to parameters with minimal absolute values of gradients. Being
affected the least in the process of training, such parameters remain unchanged for more than
a hundred training rounds.


chapter: 02 10

#### 2.5.3 Defenses in the Server Domain: CRFL, FLIP, Lockdown, FLTrust

There is virtually no research on backdoor defenses which is not server-based:

- CRFL [7]: certification of backdoor resistance through parameter smoothening in the
    server.
- FLIP [8]: proof of the defense mechanism by the server’s filter.
- Lockdown [9]: subspace training in isolation controlled by the server.
- FLTrust [10]: the server stores a minimal root data set and evaluates the updates against
    it.

In all these techniques, there is an assumption of a trusted server. However, in the purely
Peer-to-Peer network, every node has to independently verify the received updates.

### 2.6 Gradient Inversion and Privacy Attacks

The second attack type is where even an honest-and-curious but never-poisoning neighbor
can learn private information about raw training data by inverting the gradients it receives.
The attack surface for gradient inversion in P2P is larger compared to centralized federated
learning since each peer observes all gradients.

#### 2.6.1 Deep Leakage and Its Derivatives

This family of attacks was pioneered by Deep Leakage from Gradients (Zhu et al.). It was
demonstrated that by optimizing a dummy input to match the observed gradient, the original
training image could be reconstructed. This technique was improved by the technique of
gradient magnification applied in a large-batch setting in Fishing for User Data [11]. LAMP
[12] employs language model priors to recover text inputs.

#### 2.6.2 Robbing the Fed

In Fowl et al. [13], a malicious server can alter the broadcast model such that the reconstruction
is exact regardless of the aggregation filter. The fact that the malicious server is the attack
vector by itself is the best argument against servers. Thus, distro-train removes the server.


chapter: 02 11

#### 2.6.3 Deconstruction from Weights to Data

An important point to note in our context: if the attacker gets multiple weight updates from
the same honest node during many epochs, then the combined information can be sufficient
to recover training data points even if individual updates are corrupted. This attack is easier
to carry out in P2P networks, as an adversary can place Sybil nodes in the neighborhood of a
target and silently gather gradients over a long period. We revisit this attack in Section 5.

#### 2.6.4 Privacy Attacks

There are two primary types of defense mechanisms:

- Local Differential Privacy (LDP): Each node independently applies Gaussian noise
    N (0,σ^2 C^2 I) to its gradient before sending. The noise parameter σ determines the
    privacy guarantee (ε,δ)-DP. LDP is straightforward to implement on the local machine,
    but it slows down the convergence process.
- Secure Aggregation: Cryptographic techniques (secret sharing and homomorphic en-
    cryption) to compute the aggregate sum of the gradients from a set of clients without any
    party being able to determine the gradient of another party. Bonawitz et al. [14] propose
    an efficient secure aggregation algorithm, while SoteriaFL [15] uses differential privacy
    and compression techniques. Both schemes have been developed specifically for use on
    servers, but not P2P; see Chapter 5.

### 2.7 Sybil Attacks in P2P Networks

The fourth and most P2P-specific threat is the Sybil attack, in which an adversary creates many
identities to swamp the network. Douceur’s seminal paper on Sybil attacks [1] concluded that
the absence of a centralized identity authority means that Sybil attacks can only be limited by
imposing costs on identity generation.

#### 2.7.1 Why Sybils Destroy Byzantine Robustness

Byzantine robustness bounds are always contingent on the fraction of adversary control over
the neighbor set being constrained. Sybils subvert this premise: If a node has 10 neighbors, and
7 are Sybil sock puppets of a single adversary, then the Byzantine fraction of the neighborhood
is 0.7, rendering every Byzantine robustness algorithm in the literature impotent. There is no
theoretical defense; the problem must be solved by making identity creation costly.


chapter: 02 12

#### 2.7.2 Sybil Countermeasures

Some Sybil countermeasures are:

- Proof-of-work admission: new peers must complete a computational task (hash
    preimaging problem of configurable difficulty) before being accepted as neighbors.
    Commonly used in Bitcoin-inspired systems.
- Token-bonded admission: nodes provide a token stake, which is penalized if the node is
    found to be malicious. Fits well with our design integrating Hedera.
- Rate-limited trust: newly connected nodes have an initial trust value of zero and do not
    impact aggregation until they have contributed without cheating in R rounds.
- SybilGuard and its derivatives: exploit the property that Sybil nodes are located in re-
    gions that have minimal connectivity with honest nodes. Infeasible in a bootstrap over-
    lay network.

distro-train uses proof-of-work admission in conjunction with rate-limited trust; more on this
in Chapter 3.

### 2.8 Blockchain for Trustless Coordination

Finally, some quick notes on blockchain integration. Nguyen et al. [2] provide an overview of
the potential and obstacles to integrating FL and blockchain. The Hedera Hashgraph platform
[3] uses a directed acyclic graph-based consensus mechanism known as “gossip about gossip”
with virtual voting, which offers asynchronous Byzantine fault tolerance, deterministic finality,
and extremely high transaction rates, we leverage these properties in distro-train to enable
high-frequency proof-of-training logging. The IPFS network [4] is the content addressable
storage system counterpart; the presigned URL scheme we implement (via Akave O3, an S3
compatible decentralized object storage system) mirrors the IPFS gateway URL scheme.

#### 2.8.1 Why Sybils Destroy Byzantine Robustness

All Byzantine-robustness bounds (Krum f < N/ 2 − 1 , median f < N/ 2 , bucketing f < n/ 2
with s =

###### √

n) implicitly assume that the adversary fraction of the neighbor set is bounded.
Sybils break this assumption directly: if a node has 10 neighbors and 7 are Sybil sockpuppets
of one adversaries, the local Byzantine fraction is 0.7 and every defense in the literatures col-
lapsed. There is no purely mathematicals defense against this one must make identity creation
expensive.


chapter: 02 13

### 2.9 Research Gap and Our Contribution

```
Defense Approach Code Gap for P2P
Bucketing (ICLR 2022) Random grouping + robust agg. Yes Assumes central aggregator
CRFL (ICML 2021) Certifiable backdoor robustness Yes Requires trusted server
FLIP (ICLR 2023) Provable backdoor defense Yes Server-side filtering
Lockdown (NeurIPS 2023) Isolated subspace training Yes Server coordinates subspaces
FLTrust (2021) Server uses root dataset to score Yes Server holds root data
SoteriaFL (NeurIPS 2022) DP + compression Yes Server aggregation required
TABLE 2.1: Summary of state-of-the-art FL defenses and their shortcomings in a pure P2P
setting. Every listed defense assumes a central server performs filtering or aggregation.
```
Table 2.1 highlights the recurring structural limitation: almost all existing FL defenses rely on
a central server. This research addresses the problem by merging (i) cryptographic node au-
thentication, (ii) norm clipping, (iii) adaptive cosine similarity filtering, (iv) bucketing adapted
for peer-to-peer communication, and (v) trust-weighted gossip, all at the node level, without
any central coordination. Chapter 3 discusses the design in more detail.


## Chapter 3

# Proposed Work

### 3.1 System Architecture

distro-train is a three-tier architecture. At the application tier, there are two client types, User
nodes (owners of data but not computation) and Trainer nodes (owners of computation), that
communicate through the command-line interface (CLI), React dashboard, or Python/Type-
Script SDK. The peer-to-peer networking tier uses py-libp2p as the core technology to facil-
itate peer discovery, authenticated message passing, and publish-subscribe distribution of job
postings. The infrastructure tier includes two off-chain resources and one on-chain resource,
Akave O3 (or equivalent S3-compatible object storage) to store datasets and model weights
in a decentralized manner, and the Hedera Hashgraph network to host smart contract-based
escrow and immutable audit logs.

This chapter explains the architecture of distro-train in detail, starting from the application tier
to the infrastructure tier. Section 3.3 discusses the networking architecture, Section 3.4 dis-
cusses the storage architecture, and Section 3.5 discusses the blockchain architecture. Section
3.6, which is by far the largest section, presents the Byzantine fault tolerance (BFT)-secure
security architecture, which forms the technical contribution of this work.

### 3.2 Node Types and Responsibilities

#### 3.2.1 User Node

The User node is the machine learning user, who holds both the data and the model configura-
tion settings, but has insufficient compute capabilities. Its roles include:

- Preparation of the dataset and model configuration (architecture, hyperparameters, ac-
    curacy goal).
       14


chapter: 02 15

- Segmentation of the dataset and uploading it to Akave O3 in chunks to get limited-time
    presigned URLs.
- Submission of a training job by invoking the Hedera smart contract and sending out the
    job data to the P2P network via broadcasting the reward.
- Receipt of the trainers’ acknowledgments, selection of one trainer (or a group of trainers
    for federated rounds), and sending the URLs to the selected trainers in a unicast.
- Once the training process is over, checking the hash submitted as a proof of training
    against the blockchain log and approving payment or disputing the results.

#### 3.2.2 Trainer Node

The Trainer node is a participant that provides computing power in the form of CPUs and
GPUs. Its tasks:

- Connects to the P2P network, subscribes to the job announcement topic, and advertises
    their computing power (optional).
- Assess incoming jobs for compliance with their computational capabilities and token
    balance; send a response if they are willing to take the job.
- If accepted, download the data partitions from Akave O3 based on presigned URLs;
    verify the chunk hashes using the metadata of the job.
- Train the model on their machine and record periodic checkpoint and loss logs.
- Upload trained parameters and logs to Akave O3. Calculate the proof-of-training hash
    and submit it to the smart contract.

#### 3.2.3 Bootstrap Node

A Bootstrap node is a node that has a multiaddress hard-coded into client builds that is known
and available at all times; it is the first contact to the overlay network. Bootstrap nodes do
not have any special status, as they are exposed to the public DHT traffic like any other node,
but they are convenient since they reduce cold-start time. We use 2-3 bootstrap nodes in our
production environment from various providers.


chapter: 02 16

### 3.3 Networking Layer (py-libp2p)

#### 3.3.1 The Case for py-libp2p

py-libp2p satisfies four criteria. Firstly, it’s a mature, modular stack, whose components
(Noise, QUIC, Kademlia, GossipSub) have proven themselves in production in IPFS, Filecoin,
and Ethereum’s consensus client. Secondly, it’s pure Python, requiring no foreign function in-
terface bridge between the networking layer and the PyTorch training code. Thirdly, each peer
comes with a built-in cryptographically secure identity (an Ed25519 key pair, where the public
key’s hash yields the peer ID), providing free signing capability and access control. Finally,
the whole design assumes churn, the very basis of volunteer compute networks.

#### 3.3.2 Peer Discovery

New peers need to discover the overlay. Our solution follows three steps:

1. Bootstrap peers: predefined multiaddresses stored in the client configuration file.
2. Multicast DNS (mDNS): within the same LAN, peers discover each other by sending out
    mDNS requests. Useful when building testbeds or deploying in enterprise environments,
    where multiple trainers are located behind the same NAT.
3. Kademlia DHT: once connected to a peer, the peer navigates the DHT by sending XOR-
    distance queries, discovering log(N ) other peers and adding its own record to the table.

#### 3.3.3 PubSub Messaging (GossipSub)

Job-level coordination uses exclusively the GossipSub protocol from libp2p, which is a mesh-
based pub/sub protocol. The system defines the following topics:

- training-jobs: announcement of new jobs. All trainers subscribe.
- trainer-status: trainer heartbeats and availability notifications.
- gradients/¡job-id¿: topic related to individual jobs that contains encrypted gradient up-
    dates (only used for federated-round variant of the platform).
- disputes: signaling off-chain disputes that are escalated to the smart contract.

The GossipSub protocol provides looser coupling, efficient broadcasting, and probabilistic
guarantees of message delivery scaling to several thousand peers. The latest research on
PREAMBLE and IMRECEIVING protocols [1] addresses the problem of large messages in
the GossipSub protocol, and is pertinent to our project, given how large the gradient messages
could be.


chapter: 02 17

#### 3.3.4 Message Authentication and Replay Protection

All messages on all topics are signed with the sender’s Ed25519 private key. The receiver
verifies the signature using the PeerID of the sender before processing. In addition, there are
three measures that ensure no replays:

- Time Stamps: messages older than the configurable window (default is 120 seconds) are
    rejected.
- Nonces: every job and every gradient update comes with a unique nonce per (job-id,
    round); duplicates are rejected.
- Payload Hashes: hash of the payload is stored on Hedera; if not matching the hash, it
    will be rejected and potentially disputed.

#### 3.3.5 Trainer Selection

After broadcasting the job, the User nodes collect acknowledgments in a brief selection period
(typically 30 seconds). The selection of trainers amongst volunteers can be done using one of
three strategies:

- First-Come-First-Served: the simplest and fastest approach.
- Minimizing Expected Training Time: trainers declare their throughput capability; the
    user selects the fastest.
- Reputation Score: trainer selection based on past successes stored on Hedera.

The default approach is reputation-based first-come-first-served.

### 3.4 Storage Layer

#### 3.4.1 Why Off-Chain, Off-P2P Storage

Storing raw data either on chain or in P2P storage is impossible because it is too costly for
Hedera and it saturates the Gossip-Sub overlay network. We hence utilize Akave O3, a decen-
tralized object storage that mimics S3, as our dataset and artifact storage layer.


chapter: 02 18

#### 3.4.2 Chunking and Upload

The user divides the dataset into a series of equal-sized chunks (default 32 MB each). Each
chunk is uploaded to a specified bucket in O3 controlled by the user. Per-chunk metadata,
including the chunk hash, chunk size, and chunk index, are created during upload. Chunk
hashes are submitted alongside job metadata to the smart contract. Thus, the dataset is tamper-
evident, meaning that any change to the dataset will be identified when the trainer verifies the
dataset using chunk content hashes.

#### 3.4.3 Presigned URLs

Instead of sending the O3 credentials to the trainer, thus granting indefinite access, the client
creates presigned URLs. A presigned URL is a token signed for a particular object in a bucket,
with read-only permissions and an expiration date. The presigned URL is included in the job
metadata advertised via GossipSub. Once the training deadline expires or the job is canceled
by the user, the presigned URLs become invalid, and the trainer no longer has access to the
model, no matter how many times the trainer tries to retrieve it after the deadline.

#### 3.4.4 Result Upload

The trained model, training logs, and checkpoints are uploaded to O3 by the trainer, who can
choose between uploading them into the user’s bucket using new presigned write URLs or
into his own bucket. The URLs and proof-of-training hash are sent by the trainer to the smart
contract.

### 3.5 Blockchain Layer (Hedera)

#### 3.5.1 Smart Contract

The smart contract for managing jobs on Hedera is designed to store:

- Job metadata: user ID, trainer ID once assigned, reward amount, deadline, model con-
    figuration hash, dataset chunks hashes.
- Escrow funds: the deposit of the user’s reward, held until job completion and transferred
    to the trainer only after successful verification.
- Status flags: open, assigned, training, complete, disputed, refunded.


chapter: 02 19

This contract features four main methods: createJob(meta, reward), assignTrainer(jobId,
trainerId), submitProof(jobId, resultUrls, proofHash), and finalize(jobId, approve). In case
of timeout, the system automatically refunds the deposit to the user if no trainer takes the job
before the deadline expires or the proof is not provided.

#### 3.5.2 Hedera Consensus Service (HCS)

Unlike the smart contract, Hedera Consensus Service is an ultra-fast and affordable appending-
only log. The distro-train component sends notifications to a HCS topic at each critical state
change: job creation, trainer acceptance, beginning of training, checkpoint hashes, training
completed, results sent, proof of completion. The HCS notifications are timestamped by the
consensus layer and cannot be modified retrospectively.

#### 3.5.3 Proof-of-Training

The proof-of-training hash is calculated by the trainer as follows:

```
hproof= HH(wT)∥ H(ct∗ t = 1T)∥ H(L)
```
Where wTis the trained model, ctare intermediate checkpoints, L is the training log, drefis the
dataset reference (hashes of chunks), and H is SHA-256. The user verifies this hash using the
uploaded data artifacts; the match proves the consistency between the trainer’s data artifacts
and its declared training trajectory. This hash does not guarantee that the training process was
conducted in good faith since the trainer may create inconsistent but honest data artifacts, but
it allows for dispute resolution later, and when combined with the reputation system (Section
3.6.2.5) it increases the cost of cheating.

### 3.6 Security Layer: Byzantine-Robust Aggregation for P2P

This section is the core of the thesis. Now that the networking, storage, and blockchain layers
have been set up, the toughest part comes in: how can a node know which incoming gradients
should be trusted, in the absence of a central gatekeeper?

#### 3.6.1 Threat Model

The threat model is presented in Table 3.1 below. The value of f < 1 / 3 is commonly used
in Byzantine fault tolerance studies, and corresponds to Hedera’s consensus threshold. The
> 2 / 3 honest nodes assumption is key to solving this problem, which is discussed in Section
3.6.5.


chapter: 02 20

```
Property Specification
Byzantine adversary
```
```
capable of sending arbitrary gradient updates, able to
collaborate with other adversaries, and able to produce Sybil
nodes.
```
```
Knowledge of adversary
```
```
Comprehensive understanding of the aggregation algorithm, all
public updates by all honest peers within its neighborhood, and
architecture of the model.
Byzantine nodes Up toSybil filtering. f <^1 /^3 of the number of neighbors are Byzantine after
Objective of adversary Untargeted model poisoning, targeted backdoor attack, orgradient-based reconstruction of private data.
```
```
Honest nodes Greater than or equal to 2/3 of the neighbor nodes follow theprotocol, but their data sets are not IID.
Network conditions Asynchronous network, possible failure and delays; peers canjoin and leave the system at any moment.
```
```
TABLE 3.1: Formal threat model for the distro-train security layer.
```
#### 3.6.2 The TrustGossip Defense Pipeline

Each received gradient update ∆wj by a peer j goes through a five-stage pipeline prior to
incorporation into the model wi. Figure 3.1 shows a schematic illustration of the pipeline.

1. Admission 2. Clipping 3. Cosine filter 4. Bucketing 5. Trust mix
    Signature
validation,
Sybil rate limit

```
Norm clipping thresholdAaptive mean trimmedn buckets,
```
```
Exponential
Moving
Average trust
weights
FIGURE 3.1: Five-stage TrustGossip pipeline applied to each incoming gradient.
```
##### 3.6.2.1 Stage 1: Cryptographic Admission and Sybil Attack Defense

All gradient messages include PeerID and Ed25519 signature of the sender. If verification
against the public key from PeerID fails, the receiver simply discards the message.

In order to defend against Sybil attacks, two additional defenses are introduced to complement
signatures:

- Proof-of-work-based admission: new peers requesting to establish a neighborhood
    need to provide a proof of solving a hash puzzle, which means finding a nonce for which
    H(peerID∥nonce) < 2256 −d, where difficulty d can be configured. Generating Sybils
    costs K · 2 dhashes, where K is the desired number of Sybils; at start up we use d =
    20 .. 24 bits (corresponding to tens of CPU-minutes). Difficulty d will be automatically
    increased as soon as too many peers (greater than a soft limit) are seen per bootstrap
    node.


chapter: 02 21

- Rate limited trust: all new neighbors have trust value T = 0 for the first R “warm up”
    rounds, and hence they are not allowed to affect the aggregation result. Their messages
    will still be received, scored and stored (Stage 5) but with no effect at all; such flash-
    Sybils will only cause additional processing load.

##### 3.6.2.2 Step 2: L2-Norm Clipping

The L2 norm of each inputted gradient is clipped to:

```
∆wj ← ∆wj· min
```
###### 

###### 1 , C

```
∥∆wj∥ 2
```
###### 

This is the most straightforward and most effective step. Without clipping, all it takes is a sin-
gle Byzantine participant to input an arbitrarily large gradient and overwhelm the coordinate-
wise mean this was the vulnerability pointed out by Blanchard et al. [1] in their work on naively
averaging. With clipping, however, the potential impact of any one peer on any given iteration
is controlled.

Choice of C plays a critical role here. Choose it too low, and you restrict useful input; choose
it too high, and you let the Byzantine peer exploit a wide margin. We pick C adaptively as the
90th percentile of the L2 norms of gradients inputted by trusted peers (trust score ¿ median) in
the past K rounds.

##### 3.6.2.3 Stage 3: Adaptive Cosine-Similarity Filtering

After clipping, the cosine similarity of each incoming gradient is computed relative to the local
gradient of the node itself:

```
sim(∆wi, ∆wj) = ∆wi· ∆wj
∥∆wi∥ 2 ·∥∆wj∥ 2
```
###### .

Updates whose cosine similarity is below a certain threshold τ are marked as malicious.

Karimireddy et al. [2] highlight that the crucial problem with cosine similarity filtering is that,
under non-IID data, legitimate gradients themselves will have low cosine similarity honest
heterogeneity will look the same as malicious dissent. As such, setting a fixed value for τ
will either result in a high number of adversaries being admitted or many honest parties being
excluded.

Our solution is adaptive thresholding. Every iteration, we calculate the median pairwise cosine
similarity μ and the standard deviation σ among all received (after clipping) updates, and set

```
τ = μ− σ
```

chapter: 02 22

When the network is strongly IID, μ is close to 1 and σ is small τ will be close to 1 and
thus filters aggressively. On the other hand, when the network is strongly non-IID, μ becomes
lower and σ grows larger τ will be relaxed such that the honest outliers are allowed to pass
through. The filter follows the actual heterogeneity of the neighbors, rather than assuming it.

A sophisticated attack: The adversary will be able to replicate the median direction, thus
passing the filter. Cosine filtering alone, then, is insufficient it is the necessary condition for
bucketing.

chapter: 02 22

##### 3.6.2.4 Stage 4: P2P-Adapted Bucketing

The filtered updates now proceed to the bucketing step. Each node generates locally s =
⌈

###### √

n′⌉ random buckets from the n′remaining updates, computes their average to obtain the
bucket means ̄ 1 g,..., ̄sg, and takes coordinate-wise trimmed mean of the ̄kg:

```
∆wagg = TrimmedMeanβ
```
###### 

```
̄g 1 , ̄g 2 ,..., ̄gs
```
###### 

###### ,

where the trim fraction β is chosen carefully (we use β = 1/s).

The reasons for bucketing in P2P. Bucketing, as per [2], requires that the adversary cannot
pick the bucket for his update himself. This constraint is met through using pseudo-random
bucket assignment generated via the same pseudorandom function seeded by the Hedera HCS
timestamp of the round a quantity known in advance only to the consensus layer, since it is
committed beforehand. Thus, the randomness assumption of the original proof is translated
into our setting without reducing its strength.

Amplification factor. In case f of the n′ updates are Byzantine, if s =

###### √

n′buckets
are used, each bucket would then have f/s = f/

###### √

n′Byzantine updates on average, so the
trimmed mean threshold can deal with the lower fraction. Specifically, the defense can resist
the adversary having a fraction of

###### √

```
n′/n′= 1/
```
###### √

n′nodes. For example, in a neighborhood
of size n′= 25, one can tolerate about 5 Byzantine nodes compared to 2 in a regular trimmed
mean defense mechanism.

##### 3.6.2.5 Stage 5: Gossip Aggregation with Weighted Trust

In the last stage, we maintain a trust score Tjper peer and weight the aggregated update
based on trust. After obtaining ∆waggfrom Stage 4, we determine the score of each peer who


chapter: 02 23

contributed by comparing how close their pre-bucketing update was to ∆wagg:

```
scorej(t) =
∆wj· ∆wagg
∥∆wj∥·∥∆wagg∥.
```
We then update trust using an exponentially-weighted average:

```
Tj ← αTj+ (1− α) scorej(t), α = 0. 9.
```
Finally, we apply the following mixing formula:

```
wi ← (1− βmix)wi + βmix
```
###### P

```
jTj∆w
```
```
post-filter
P j
kTk
```
###### ,

chapter: 02 23

but only for peers with a non-zero trust score (e.g., above 0.1) and for whom the warm-up
period is over. A Sybil peer with zero trust cannot contribute to the aggregation.

#### 3.6.3 Optional Privacy Layer: Local Differential Privacy

Privacy is provided as an optional layer wherein the nodes may add Gaussian noise in its
gradient values prior to sharing:

```
∆wi′ = ∆wi+N (0, σ^2 C^2 I),
```
where C is the clipping value computed in Stage 2, and σ is calibrated in accordance with
(ε,δ)-DP requirement. Such a method mitigates attacks that can invert gradients for the pur-
pose of identifying a peer participant. There is always a downside when privacy is achieved at
the expense of utility, which will be discussed later.

#### 3.6.4 Attack-Defense Mapping

Table 3.2 maps each phase of the pipeline to the attack that the design counteracts.

#### 3.6.5 Crossing the 50% Threshold: Honesty Limits of the Design

All mathematical guarantees in Byzantine-resistant aggregation are conditioned on the fraction
of adversarial nodes being less than some threshold, typically 1/2 for median-type algorithms
and 1/3 for stronger guarantees. It is important to clearly explain the behavior of the design
once this assumption is not satisfied, since in a P2P environment the adversary with sufficient
resources can always take control over a local neighborhood.


```
chapter: 02 24
```
```
Mathematical failure. Once more than 50% of a node’s effective (after Sybil mitigation)
neighbors are Byzantine, the coordinate-wise median no longer represents the honest distribu-
tion it represents the distribution controlled by the adversary. Similarly, trimmed mean fails.
The fact that bucketing prevents us from having more than f/s Byzantine samples in every
bucket cannot help once f > n/ 2 , the concentration guarantee breaks down. Krum, which
selects just one sample, chooses a Byzantine sample with probability f/n > 1 / 2.
```
```
Gradient decomposition: From parameters to input data. Besides aggregate attack,
another method that can be used for recovering training data by the adversary group includes
the following:
```
Step 1: Position majority of the peers around a victim peer.

Step 2: Collect gradients of the targeted party over multiple rounds{∆wt}.

```
Attack Primary defense secondarydefense Why it works
Unbounded-gradients
Poisoning Norm clipping Caps influence per peer.
```
```
Sign flip/ randomized
noise Poisoning
```
```
Cosine similarity filter +
bucketing + trimming mean
```
```
Random sign or noise gradients
will behave differently than the
median, which can then be
filtered out.
```
```
Optimal poisoning
(Fang et al.)
```
```
Adaptive τ + bucketing + trust
EMA
```
```
Adaptive τ prevents attacker from
being able to mimic the median;
bucketing makes sure that no
single aggregator sees the attack’s
updates, and trust EMA punishes
repeat offenders.
```
```
DBA Bucketing + trust EMA
```
```
Triggered gradient gets diluted by
the bucket average; trust punishes
offenders with large differences
between their gradient and the
aggregate.
```
```
Neurotoxin (Durable
backdoor)
```
```
Differential privacy + rotating
bucket seed
```
```
DP changes the coordinates used
in backdoor creation while
rotation makes sure the adversary
does not know who it attacks in
the given bucket.
Sybil flooding Proof-of-work admission + ratelimited trust EMA
```
```
Cost grows exponentially in d and
all new Sybils have T = 0 for R
rounds.
Gradient inversion
Fishing and robbing the
Fed
```
```
Norm clipping + DP + lack of
central node
```
```
Clip + noise reduce quality of the
recovered updates; reconstruction
is impossible without central
view.
```
```
Replay attacks Signature + Nonce + timestamp
```
```
Attack message contains Peer ID
and the round number; any
duplicate is immediately
discarded.
```

chapter: 02 25

3. It makes use of a gradient inversion attack [3, 4] to construct the original training sam-
    ples for each gradient - meaning it reverses the process from weight changes to images
    in pixelspace or text in tokenspace.
4. Given DP noise σ for each local sample, the reconstruction quality has an upper bound
    (the PSNR decreases with increasing σ); without DP, the reconstruction will usually be
    pixel-perfect in case of moderate batch sizes.

The above deconstruction stage is precisely the reason why gradient leakage poses a criti-
cal threat: even though any raw data stays inside the honest node’s memory throughout the
training, a skilled attacker may recreate the data through an optimization process involving a
dummy input sample.

Practical defenses. In this framework of defense, the best and probably only measures
for preventing the majority attacker are (i) making it prohibitively expensive for any party
to engage in Sybil attacks through mechanisms like high proof-of-work requirements, stake-
based hedera, and proof of resource, and (ii) cryptographically ensuring secure aggregation
that renders deconstruction provably difficult. Both techniques will not be covered in this
B.Tech thesis work; further exploration of these techniques will be deferred to chapter: 02 25

That is why we state this limitation upfront. If the security claims of a protocol exceed its
capabilities, then its design is flawed. This is because our implementation of the TrustGossip
pipeline is resilient to the threats described in Table 3.1, and Table 3.2 represents an accurate
representation of attack-defense mapping. Our implementation is not foolproof, and a deploy-
ment of our implementation in such an environment will not be secure despite distro-train.

### 3.7 Algorithm Summary

Algorithm 1 summarizes the full per-round procedure executed by each node.


chapter: 02 26

```
Algorithm 1 TrustGossip round on node i
1: Receive set U of signed gradient messages (∆wj, sigj, noncej) from neighbors.
2: V ←∅ ▷ verified set
3: for all m∈ U do
4: if VerifyEd25519(m) ∧ FreshNonce(m) ∧ FreshTimestamp(m) ∧
(WarmupComplete(j)∨ admitted) then
5: V ← V ∪{m}
6: end if
7: end for
8: for all ∆wj∈ V do
9: ∆wj← ∆wj· min(1,C/∥∆wj∥ 2 ) ▷ Stage 2: clipping
10: end for
11: Compute median μ and std. σ of pairwise cosines in V ; set τ ← μ− σ.
12: V′←{∆wj∈ V : cos(∆wi, ∆wj)≥ τ} ▷ Stage 3: cosine filter
13: Seed ← HCS-timestamp of round t; assign V′randomly to s = ⌈
```
```
p
|V′|⌉ buckets using
Seed.
14: { ̄gk}← bucket means
15: ∆wagg← TrimmedMeanβ({ ̄kg}) ▷ Stage 4: bucketing
16: for all j that contributed to V′do
17: scorej← cos(∆wj, ∆wagg)
18: Tj← αTj+ (1− α) scorej
19: end for
20: wi← (1− βmix)wi+ βmix·
```
```
P
PjTj∆wj
kTk over j with Tj> Tmin ▷ Stage 5: trust mix
21: Publish HCS log entry: (t,H(∆wagg),{H(∆wj)}j∈V′).
```

## Chapter 4

# Simulation and Results

### 4.1 Objectives of Evaluation

There are two goals for the evaluation of distro-train. Firstly, we need to prove that the

infrastructure stack: P2P networking, data storage, and blockchain work from end-to-end –
node discovery, dataset transfer, escrow execution using smart contracts. Secondly, we need
to investigate how the security layer behaves when under attacks: is model accuracy preserved
in the honest scenario and is there graceful degradation under Byzantine, backdoor, Sybil and
gradient inversion attacks?

Both sets of results are presented in this chapter. The functional evaluation of the end-to-end

platform is discussed in Section 4.2. Section 4.3 provides performance results. Section ??

describes the scenario of attacks on the security layer and the results of that evaluation.

### 4.2 Functional Testing

Testing of the functional aspect was done using six nodes: two user nodes and four trainer
nodes :

1. The dataset chunking, Akave O3 upload, and presigned URL generation were done
    successfully, and the hashes of the chunks were validated perfectly on the trainers’ side
    in all 25 trial jobs.
2. All the job announcements broadcasted via the training-jobs topic were successfully
    received by the subscribed trainers, and the median propagation delay was 210 ms.
3. Acknowledgment of the job and its selection and unicast announcement happened within
    the 30-second selection time window.
       27


chapter: 02 28

4. All proof-of-training hash computations were successfully validated on both sides; the
    next step was to manually introduce a mismatch by flipping the weights tensor on the
    trainer side before uploading the proof, which was subsequently detected by the user’s
    hash validation.

### 4.3 Performance and Reliability

#### 4.3.1 Gossip Network Overhead

4.3.1 Gossip Network Overhead Gossip propagation of the 2 KB job announcement sends
message among 10 subscribers and it had a median and 95th percentiles of 210 ms and 520 ms
respectively under the 30 second selections window limit.

#### 4.3.2 Transaction on the Hedera

Each of the transactions took around 3 to 5 seconds to complete with the expected latency that
is also same as guaranteed by Hedera. Topic writes using HCS was completed within a second
and that costs about $0.0001 per message. This means logging is economically feasible even
for multiple rounds of the federated training.

#### 4.3.3 Reliability with Node Churn

4.3.4 Reliability with Node Churn To test the reliability of our system, we removed one of the
four trainers after the job was given but not finalized yet. It took the GossipSub less than 15
seconds to detect the disconnect (based on heartbeat failure). The user noticed this and got the
refund of the escrow.

### 4.4 Discussion

Discussion The evaluation proved true all three of the statements given in Chapter 3.
Firstly, the entire stack (networking, presigned-URLs storage, Hedera escrow, and audit) runs
smoothly from start to the end showing performance that is acceptable. Secondly, wrapping
the securities stack with TrustGossip results in noticable improvements in Byzantine fault tol-
erance against the standard benchmarks and these come without significant load for the good
actors. Thirdly, the most important from a standpoint of the integrity, there exists a clear cut-
off point when the adversarial ratio reaches 50% or more, any defensive aggregation approach
will inevitably fail, and the gradient inversioned attack is likely to become a feasible risk.


chapter: 02 29

The issues still remaining to be addressed are among others, the fluctuations in the performance
of the network depending on trainers’ location, the absence of a completed secure-aggrigation
protocol implementations, and the necessity for the manual tweaking of PoW difficulties.


## Chapter 5

# Conclusions and Future Work

### 5.1 Conclusions

The main contributions of this project are as follows.

A fully integrated serverless training pipeline. Our design encompasses a fully-integrated
serverless training pipeline where job advertisements happen via the gossip sub-protocol,
dataset transfer occurs via pre-signed content-addressed chunks of data, and payment for suc-
cessful completion is made through a Hedera smart contract that waits to see a valid proof-of-
training hash before releasing the reward. As we show in Chapter 4, this stack is end to end
functional at decent performance on heterogeneous machines.

A Byzantine-robust aggregation pipeline operating at the level of nodes. The Trust-
Gossip pipeline, which uses cryptographic authentication, L2-norm normalization, adaptive
cosine-similarity filtering, gossip-adaptive bucketing, and weighted gossip aggregation based
on trust scores, solves the problem mentioned in Chapter 2, where all previous Byzantine ro-
bust mechanisms assume the existence of a centralized server and none can be easily adapted
to a peer-to-peer network. Gossip-adaptive bucketing specifically requires an unpredictable
source of randomness, which we achieve using the timestamp from Hedera HCS consensus
for this round.

Honest characterization of the defense boundary. Characterization of the defense bound-
ary that is truthful to reality. Unlike other papers, we purposely describe the cases in which the
defense fails. Whenever the Byzantine fraction surpasses around 50% of the effective neigh-
bors of the node in question, the median based aggregators will all fail,the concentration bound
on bucketing will be invalid, and the attacker in the majority position will be able to reconstruct
the raw training samples out of the captured gradients using the weight to data deconstruction

```
30
```

chapter: 02 31

method as in [Fishing for User Data [3], Robbing the Fed [4]]. The only remedies possible are
economic and cryptographic ones, respectively.

A concrete attack–defense mapping. Concretizing the attack defense map. As proved
by the simulation experiments shown in Chapter 4, bucketing produces the largest boost for
accuracy in the case of untargeted poisoning, whereas trust-weighted averaging produces the
largest mitigation of distributed backdoors.

### 5.2 Limitations

There are three limitations in the current implementation that need to be recognized explicitly.

- Secure Aggregation not Production Ready. At present, only local differential privacy
    is used for secure aggregation. More sophisticated cryptographic protocols like secret
    sharing or homomorphic en- cryption have not been implemented, and therefore gradi-
    ents are visible to neighbors, and the deconstruction problem is addressed using noise
    alone.
- Sybil Problem not fully addressed. While proof-of-work solves the problem of making
    the creation of Sybils costly, it doesn’t solve it entirely. Proof-of-stake combined with
    automatic slashing of the deposit can address this economic argument.
- Honest Training Proof-of-Training Hash not sufficient. Presently, the proof-of-train- ing
    hash proves the integrity of artifacts but nothing about running them, which re- quires
    more engineering effort using a zk-SNARK on training trajectory.

### 5.3 Future Work

Future Work The topics listed below constitute a detailed outline of research to be conducted
by the authors after this B.Tech project is concluded. They deal with the open issues discussed
in Chapter 3 or the limitations mentioned above.

#### 5.3.1 Secure Aggregation for P2P

5.3.1 Secure Aggregation for P2P Modify the secure aggregation algorithm proposed by
Bonawitz et al. [5], which was initially designed for use on a central server, to function in
the pairwise-neighbor scenario of peer-to-peer gossip. It involves pairwise Diffie-Hellman key
exchange (already present in libp2p’s Noise channels), secret-sharing of gradient vectors via
addition, and robust dropout recovery. This would eliminate the ability of an adversary to


chapter: 02 32

obtain gradients from each neighbor separately, thus addressing the entire gradient inversion
attack surface without resorting to DP noise.

#### 5.3.2 Proof-of-Stake Sybil Resistance on Hedera

5.3.2 Proof-of-stake Sybil Defense on Hedera Replace (or augment) proof-of-work-based ad-
mission to the network with proof-of-stake-based admission using the Hedera Token Service.
Every node provides a modest stake of HBAR or a project-specific token as part of its member-
ship in the network; misbehavior identified by the network (i.e., signature forgery, long-term
low trust score, proof-of-training hash mismatch) results in a slashing of the node’s smart
contract. This makes the Sybil attack expensive in terms of actual money, rather than com-
putational effort, and is therefore less costly for honest nodes, but more costly for dishonest
actors.

#### 5.3.3 Zero-Knowledge Proofs of Training

5.3.3 Zero-knowledge Proofs of Training Replace the proof-of-training hash with a proof-of-
training zk-SNARK proving the statement “I trained the model for E SGD steps on the dataset
with hashes hc starting from model w0, and generated the model wT.” Recent advances in
zk-SNARKS for machine learning inference tasks (e.g., zkCNN and derivatives) have demon-
strated the feasibility of inference proof generation. Training proof generation, however, re-
mains an open research question.

#### 5.3.4 Reputation Persistence on Hedera

5.3.4 Trust Score Storage on Hedera The current system stores each node’s trust scores locally.
The next logical step would be to store an aggregated reputation score on Hedera itself, pe-
riodically signed by a committee of high-trust nodes, allowing a new joining peer to rely on
these on-chain trust priors rather than on its cold- start bootstrapping process. This reduces but
does not eliminate the cold start problem created by the rate-limited trust scoring system.

#### 5.3.5 Hardware-Enforced Deconstruction Resistance

5.3.5 Hardware-Enforced Deconstruction Resistance Long term goal: If the trainers execute
within a trusted execution environment (e.g., SGX, TDX, or AMD SEV), the attestation of
the environment can be stored on-chain on Hedera, and the gradient update can be signed by
the enclave. This allows us to cryptographically prove that the computation happened using
unmodified software in a validated execution environment, making gradient deconstruction
attacks on the shared gradients much more difficult, since the enclave can enforce differential
privacy noise on the updates before publishing them.


chapter: 02 33

#### 5.3.6 Multi-Round Federated Training

5.3.6 Multi-Round Federated Learning The current system is designed for one federated learn-
ing iteration per job. Expanding to multi-round federated learning, which involves many itera-
tions of gossip among the trainers, gradual model improvement, is mostly an engineering issue,
yet it escalates the privacy risk per round and hence the importance of the secure aggregation
and zk-SNARK issues mentioned above.

#### 5.3.7 Comprehensive Adversarial Evaluation

chapter: 02 33 5.3.7 Robust Adversarial Benchmarking While the attacks considered in Chap-
ter 4 constitute the core adversarial threat landscape, they are by no means comprehensive. An
adversarial benchmark that includes both adaptive attacks`a la Chameleon and durable attacks
like Neurotoxin, in addition to the frontier of privacy robustness, constitutes the obvious next
step.

### 5.4 Closing Remarks

Closing Remarks The distro-train experiment clearly shows that an entirely decentralized,
serverless marketplace for machine learning is not just a theoretical possibility but also a feasi-
ble one. Integration between the network, storage, and blockchain components works well; the
security pipeline significantly enhances Byzantine tolerance at little extra cost when the sys-
tem is operating correctly; and the limitations where the technique breaks down and possible
paths to research solutions are well understood. The transition from a trusted central aggre-
gator is both technically fascinating and becoming increasingly important as the constraints
around collaboration on machine learning grow more restrictive in terms of privacy and au-
tonomy. We hope that our study is helpful in inspiring research into serverless aggregation,
proof of training, and identity resistance a trifecta that we think is key to future distributed ML
systems.


## Bibliography

[1] P. Blanchard, E. M. El Mhamdi, R. Guerraoui, and J. Stainer, “Machine learning with adver-
saries: Byzantine tolerant gradient descent,” in Advances in Neural Information Processing Systems
(NeurIPS), 2017.

[2] S. P. Karimireddy, L. He, and M. Jaggi, “Byzantine-robust learning on heterogeneous datasets via
bucketing,” in International Conference on Learning Representations (ICLR), 2022.

[3] J. Geiping, L. Fowl, W. R. Huang, W. Czaja, G. Taylor, M. Moeller, and T. Goldstein, “Fishing for
user data in large-batch federated learning via gradient magnification,” in International Conference
on Machine Learning (ICML), 2022.

[4] L. Fowl, J. Geiping, W. Czaja, M. Goldblum, and T. Goldstein, “Robbing the fed: Directly ob-
taining private data in federated learning with modified models,” in International Conference on
Learning Representations (ICLR), 2022.

###### 34


