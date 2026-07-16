# Documentation revisions and traceability

This documentation is maintained as version-controlled source in the public
[`fluxinc/flux-docs`](https://github.com/fluxinc/flux-docs) repository. Git
commits are the revision record: each published page can be traced to an
immutable commit, author timestamp, change description, and diff.

## Publication process

Changes merged to the `master` branch trigger the
[`Deploy VitePress site to Pages`](https://github.com/fluxinc/flux-docs/actions/workflows/deploy.yml)
workflow. The workflow checks out the full repository history, installs locked
dependencies, builds the VitePress site, uploads the generated artifact, and
deploys it to GitHub Pages. A successful workflow run is publication evidence;
the commit remains the content revision of record.

The DICOM Capacitor product repository also pins a `flux-docs` commit as a Git
submodule. That pin records the documentation revision selected with the product
source at a point in time. The live public site may be newer because it also
contains later corrections and documentation for other Flux products.

## Review a revision

1. Open the
   [DICOM Capacitor documentation commit history](https://github.com/fluxinc/flux-docs/commits/master/docs/dicom-capacitor).
2. Select a commit to review its exact diff and metadata.
3. Open the corresponding Pages workflow run and confirm the build and deploy
   jobs succeeded.
4. When reviewing a product release, compare the `flux-docs` submodule commit in
   that product revision with the documentation commit under review.

## Selected revision milestones

This is a navigational index, not a substitute for the complete Git history.

| Date | Commit | Revision evidence |
| --- | --- | --- |
| 2024-11-12 | [`c8c03d5`](https://github.com/fluxinc/flux-docs/commit/c8c03d56b1aebc5a07695734572f9ea586968ec1) | Initial structured DICOM Capacitor documentation |
| 2025-11-25 | [`9a81f66`](https://github.com/fluxinc/flux-docs/commit/9a81f667750b87c4321fc848ed7276f9993ace3b) | Storage receipt, audit, instance, and configuration logging documentation |
| 2026-03-21 | [`c740eef`](https://github.com/fluxinc/flux-docs/commit/c740eef2f417dffc13e2b62858725997e9b53900) | Cross-platform coverage and Lua documentation audit corrections |
| 2026-03-23 | [`5cb3a22`](https://github.com/fluxinc/flux-docs/commit/5cb3a22bb1f79ab9f39c0b16630fa19064fef50d) | HTTP API and configuration reference update |
| 2026-06-16 | [`833e329`](https://github.com/fluxinc/flux-docs/commit/833e329641b2d3a9fae5db99c7a8d30c8219acf9) | Redacted C-FIND logging and fail-policy documentation |
| 2026-06-30 | [`cfdba94`](https://github.com/fluxinc/flux-docs/commit/cfdba940465232785de17b1a5d9ea4569c224111) | API authentication model and PHI-bearing read corrections |

## Scope of the record

Git and Pages establish content revision and publication. They do not, by
themselves, prove that a documentation change completed a product verification,
release approval, training activity, or customer notification. Those records
belong to the corresponding product release and quality process.
