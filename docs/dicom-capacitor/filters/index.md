# Filters

Capacitor filters are used to modify incoming DICOM data before it is sent to destinations, and in some cases before proxied query data is sent upstream or returned downstream. The following filters are available:

- [Route](/dicom-capacitor/filters/route): Routes incoming DICOM data to different destinations based on configurable criteria.
- [Mutate](/dicom-capacitor/filters/mutate): Mutates incoming DICOM data based on configurable criteria.
- [Sort](/dicom-capacitor/filters/sort): Sorts images so they arrive at the destination in the correct order.
- [Lua](/dicom-capacitor/filters/lua): Programmable scripting for storage routing/mutation, query proxying, and shared state using Lua.
