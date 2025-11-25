# config.yml

The `config.yml` file contains the main service configuration settings for DICOM Capacitor.

## Settings

- **`scpPort`** (default: `104`) - The port that DICOM Capacitor will listen on for Store SCP requests.

- **`aeTitle`** (default: `FLUX_CAPACITOR`) - The AE Title that DICOM Capacitor will use to identify itself, unless overridden by the `nodes.yml` file.

- **`cachePath`** (default: `%ProgramData%\Flux Inc\DICOM Capacitor\cache`) - The path to the cache directory that DICOM Capacitor will use to store DICOM data. We recommend that you add this folder to your antivirus exclusion list.

- **`filters`** (default: ``) - A comma-separated list of filters that DICOM Capacitor will apply to incoming DICOM data.

  Filter values include:
  - `route` - Routes incoming images to different nodes, discards, or saves to disk. Requires `routings.yml` to be present in the same directory as `config.yml`.
  - `mutate` - Mutates incoming images based on a set of mutations. Requires `mutations.yml` to be present in the same directory as `config.yml`
  - `sort` - Re-orders DICOM images based on configurable criteria. Requires `sortings.yml` to be present.
  - `siemens_cto_converter` - Converts all Siemens CT images to DICOM BTO format
  - `hologic_sco_converter` - Converts all Hologic SCO images to DICOM BTO format

- **`activationCode`** (default: ``) - The activation code that DICOM Capacitor will use to activate the software. If a code is not provided, DICOM Capacitor will run in trial mode.

- **`aeTitlePrefix`** (default: `DCP_`) - Associations have the flexibility to utilize either the node's actual AE title or the prefixed AE title. For instance, both `STORE_SCP` and `DCP_STORE_SCP` would point toward the same node. This may be required when the sending device does not allow for duplicate AE title entries.

- **`autoAdjustLineSpeed`** (default: `false`) - Automatically adjusts the `MinimumLineSpeed` (more on that later) based on the recent transfer speeds.

- **`autoSaveLineSpeed`** (default: `false`) - Determines whether the `MinimumLineSpeed` should be saved to the `nodes.yml` file.

- **`batchSize`** (default: `0`) - The number of DICOM images to process in a single batch. A value of `0` indicates that DICOM Capacitor should process images as quickly as it can, and try to complete series as a single batch.

- **`clientTimeout`** (default: `600`) - The number of seconds that DICOM Capacitor will wait for a client to connect before timing out.

- **`ctoConvert`** (default: `false`) - This is a special setting that must be set to true if you are using the Siemens CTO Converter filter.

- **`ctoExpiryMinutes`** (default: `30`) - The number of minutes that DICOM Capacitor will wait before expiring a CTO.

- **`ctoOnExpire`** (default: `expire`) - Determines what to do with CTOs that have expired.
  - `expire` - Moves the expired CTO to the `expired` directory
  - `accept` - Accepts the expired CTO as a new CT
  - `delete` - Deletes the expired CTO (treat this with caution)

- **`cycleRejectedFilesOnStartup`** (default: `true`) - Determines whether DICOM Capacitor should re-process files that were rejected during the last run.

- **`daysToKeepLogs`** (default: `0`) - The number of days that DICOM Capacitor will keep [individual instance logs](logs.md#per-file-logging) before deleting them.

- **`defaultTransferSyntax`** (default: ``) - The default transfer syntax that DICOM Capacitor will use to store DICOM images. If this value is not provided, DICOM Capacitor will use the transfer syntax of the incoming image.

  Accepted values are:

  **Lossless**:
  - `ImplicitVRLittleEndian`
  - `ExplicitVRLittleEndian`
  - `ExplicitVRBigEndian`
  - `JPEGProcess14SV1` or `JPEGLossless`
  - `JPEGProcess14`
  - `JPEG2000Lossless`
  - `RLELossless`

  **Lossy**:
  - `JPEG2000Lossy`
  - `JPEGLSNearLossless`
  - `JPEGProcess1`
  - `JPEGProcess2_4`

- **`dropUnfilteredInstances`** (default: `false`) - Determines whether DICOM Capacitor should drop instances that do not match any filters. **BE CAREFUL WITH THIS SETTING AS IT CAN LEAD TO DATA LOSS**

- **`duplicateBehavior`** (default: `accept`) - Determines how DICOM Capacitor should handle duplicate instances.
  - `accept` - Accepts all instances, regardless of whether they are duplicates
  - `reject` - Rejects duplicate instances if they are received within the `duplicateThreshold` time
  - `ignore` - Accepts all instances, but discards duplicates if they are received within the `duplicateThreshold` time

- **`duplicateThreshold`** (default: `900`) - The number of seconds that DICOM Capacitor will use to determine whether an instance is a duplicate.

- **`echoInterval`** (default: `0`) - The number of seconds that DICOM Capacitor will wait between sending DICOM Echo requests to clients. Use this to avoid excessive network traffic. The default value of `0` disables this feature.

- **`expiryThreshold`** (default: `604800`) - The number of seconds that DICOM Capacitor will use to determine whether an instance has expired. Expired instances will be deleted from the cache.

- **`findScpPort`** (default: `1041`) - The port that DICOM Capacitor will use to listen for Find SCP requests.

- **`holdIncomingStorageAssociations`** (default: `true`) - Determines whether DICOM Capacitor should apply back-pressure to incoming storage associations when the cache is busy. When enabled, it throttles inbound C-STORE associations based on the number of files in the `New` cache. The hold grows by one second per 200 queued items. This helps prevent the system from being overwhelmed by a flood of incoming data.

- **`limitMaxCMoveResponseRemainingCount`** (default: `-1`) - Limits the maximum number of remaining C-MOVE responses reported. When enabled (value >= 0), C-MOVE responses whose `Remaining` property is higher than this value won't be forwarded downstream to the C-MOVE client. A value of `-1` indicates no limit.

- **`logSuffix`** (default: `#{2,2}-#{8,50}-#{10,20}`) - Attributes displayed inside log files. The default value will display: `SOPClass-AccessionNumber-StudyDescription`, e.g., `BT_ACC12345-12345678`. See [Per-File Logging](logs.md#per-file-logging) for more details.

- **`maxClientsPerServer`** (default: `0`) - The maximum number of clients that DICOM Capacitor will allow to connect to a single server. This is a technical limit and should be set to `0` unless you have a specific reason to change it.

- **`maxDataBuffer`** (default: `1048576`) - The maximum size of the data buffer that DICOM Capacitor will use for communication.

- **`maxEnumeratedFiles`** (default: `1000`) - The maximum number of files that DICOM Capacitor will enumerate per pass when scanning the cache for ripe files. This acts as a "Cache Enumeration Guard" to prevent long-running ripeness checks on extremely large caches. Set to `0` to disable the cap (enumerate all files).

- **`maxEnumeratedItems`** (default: `0`) - The maximum number of items that DICOM Capacitor will enumerate when searching a directory for files.

- **`maxPDVsPerPDU`** (default: `1`) - The maximum number of PDVs that DICOM Capacitor will use per PDU. Leave this value at `1` unless you have a specific reason to change it.

- **`minFreeSpace`** (default: `10`) - The minimum percentage of free space that DICOM Capacitor will require on disk while still receiving data.

- **`minimumAge`** (default: `0`) - The number of seconds Capacitor will wait before processing an instance.

- **`minimumLineSpeed`** (default: `0`) - The minimum transmission speed, in KB/s, that DICOM Capacitor will use to determine if a storage operation has failed. Capacitor will proactively abort the transfer if the average speed falls significantly below this threshold.

- **`moveRejectedCachedFiles`** (default: `true`) - Determines whether DICOM Capacitor should move rejected files to the `rejected` directory.

- **`myAeTitle`** (default: `FLUX_CAPACITOR`) - The AE Title that DICOM Capacitor will use to identify itself when sending DICOM data and responding to DICOM queries. This value can be overridden by "impersonation" in the `nodes.yml` file.

- **`processDelay`** (default: `0`) - The number of milliseconds to delay delivery of prepared studies. This is part of an "Adaptive Study Delivery Window" system. It controls when prepared studies are delivered. Late-arriving images within the window (`ProcessDelay` × `processDelayWindowMultiplier`) are sent immediately instead of waiting for the full `ProcessDelay`. This reduces latency for late-arriving images while maintaining study cohesion.

- **`processDelayWindowMultiplier`** (default: `1`) - A multiplier applied to the `processDelay` to define the "Adaptive Study Delivery Window". Late-arriving images that arrive within `ProcessDelay` × `processDelayWindowMultiplier` milliseconds of the study being processed are sent immediately. Set to `0` to disable the adaptive window feature.

- **`processSchedule`** (default: ``) - A YAML array of time ranges that DICOM Capacitor will use to determine when to process data, e.g., `- 13:30 - 23:59` will process data between 1:30 PM and midnight.

- **`queryRetrieveScpPort`** (default: `1042`) - The port that DICOM Capacitor will use to listen for Query/Retrieve SCP requests.

- **`rejectAbstractSyntaxes`** (default: ``) - A YAML array of Abstract Syntaxes, in UID format, that DICOM Capacitor will reject.

- **`removeOrphanedIncomingFiles`** (default: `true`) - Determines whether DICOM Capacitor should remove orphaned incoming files from the cache.

- **`storageCommitAeTitle`** (default: `COMMIT_SCP`) - The AE Title that DICOM Capacitor will use to identify itself when sending DICOM Storage Commitment requests.

- **`storageCommitPendingNEventReportRequestExpiry`** (default: `12000`) - The number of seconds that DICOM Capacitor will use to determine whether a Storage Commitment request has expired.

- **`storageCommitScpPort`** (default: `1043`) - The port that DICOM Capacitor will use to listen for Storage Commitment SCP requests.

- **`storageCommitSendTimeout`** (default: `15000`) - The number of milliseconds that DICOM Capacitor will use to determine whether a Storage Commitment request has timed out.

- **`storageInterval`** (default: `250`) - The number of milliseconds that DICOM Capacitor will wait between storage operations.

- **`storageReceiptExpiryHours`** (default: `8`) - The number of hours that DICOM Capacitor will use to determine whether a [storage receipt](logs.md#storage-receipts) has expired. Expired receipts will be deleted from the `cache/receipts/` directory.

- **`storageAssociationHoldExpectedTtlSeconds`** (default: `30`) - The safety limit (in seconds) for the `holdIncomingStorageAssociations` back-pressure mechanism. The calculated hold time will be capped at the lower of 30 seconds or this value.

- **`studyThreshold`** (default: `0`) - The number of seconds that DICOM Capacitor will wait before arrival of the last image before processing the images contained in a single study. This setting is important if you are using the `sort` filter.

- **`suppressLogAeTitles`** (default: `['HEALTHCHECK']`) - A YAML array of Calling AE Titles for which diagnostic logging should be bypassed end-to-end. This is useful for reducing log noise from health check probes or frequent pollers. Associations from these AE Titles will not generate standard association logs. See [Service Log Rotation](logs.md#service-log-rotation) for more details.

- **`worklistDays`** (default: `1`) - The number of days of worklist records that Capacitor will attempt to retrieve as part of cached `Worklist` queries.

- **`worklistFilterStored`** (default: `false`) - Determines whether DICOM Capacitor should filter out worklist items for studies that have already been stored. This feature relies on storage receipts, so `storageReceiptExpiryHours` must be greater than 0 for it to work effectively.

- **`worklistInterval`** (default: `30000`) - The number of milliseconds that DICOM Capacitor will wait between worklist queries.

## Command Line Overrides

Most `config.yml` settings can be explicitly overriden via command line options when prefixed with `--config.`, e.g., `--config.myAeTitle=MY_AE_TITLE` is analogous to `myAeTitle: MY_AE_TITLE` in the config.yml file.

## Environment Variable Overrides

Most `config.yml` settings can also be overridden via environment variables by prefixing the setting name with `CAPACITOR_`, e.g., `CAPACITOR_MY_AE_TITLE=AE_TITLE` is analogous to `myAeTitle: AE_TITLE` in the config.yml file.

Command line overrides supersede environment variable overrides which in turn supersede config.yml file settings. This allows flexible configuration of DICOM Capacitor via environment variables that can be set externally in container/VM environments without needing to modify config files.
