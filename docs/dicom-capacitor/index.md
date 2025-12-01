# DICOM Capacitor by Flux Inc

## Overview

DICOM Capacitor is a DICOM store-forward router that can be used to route DICOM images from a source to a destination.
It is designed to be used in a clinical setting where a DICOM modality (e.g. a CT scanner) needs to send images to a
PACS (Picture Archiving and Communication System) but the network is not reliable, compression is required, or the user
wishes to make changes to either inbound or outbound images and data.

Capacitor listens for and relays C-ECHO, C-STORE, and C-FIND requests and responses, as well as C-MOVE requests,
storage commitment, and other DICOM services.  It can also be configured to anonymize, compress, and encrypt images.

## General Features

- **Store-Forward**: Stores and forwards DICOM images from a source to a destination.
- **Compression**: Compresses DICOM images using JPEG or JPEG2000.
- **Anonymization**: Anonymizes DICOM images by removing or replacing identifying information.
- **Encryption**: Encrypts DICOM images using AES-256.
- **Routing**: Routes DICOM images to different destinations based on configurable criteria.
- **Mutations**: Applies mutations to DICOM images based on configurable criteria.
- **Sorting**: Sorts DICOM images based on configurable criteria.
- **Storage Commitment**: Sends and receives DICOM storage commitment requests.
- **Worklist**: Queries, caches, and manipulates DICOM worklist data.
- **Query/Retrieve**: Queries and retrieves DICOM images from a remote node.

Capacitor is designed to be:

- **Reliable**: Capacitor is designed to be reliable and robust, and can handle large volumes of DICOM data.
- **Scalable**: Capacitor can be used to route DICOM data to multiple destinations, and scales to use available memory
     and CPU resources.
- **Flexible**: Can be configured to route, compress, anonymize, encrypt, and manipulate DICOM data in a
  variety of ways.

## Technical Features

- **Multithreaded**: Multiple threads process DICOM data.
- **Stateless**: Stops and starts without losing data.
- **Fault-tolerant**: Recovers from errors and network outages.
- **Secure**: Uses encryption both at rest and in transit.

## Copyright

DICOM Capacitor is a product of Flux Inc.  All rights reserved.
