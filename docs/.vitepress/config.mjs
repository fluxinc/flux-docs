import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Flux Docs",
  description: "Documentation for our Products",
  base: "/",
  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }]
  ],
  themeConfig: {
    logo: "/logo.svg",
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      {
        text: "DICOM Capacitor",
        link: "/dicom-capacitor/",
      },
      { text: "DICOM Printer", link: "/dicom-printer-2/" },
      { text: "Buy", link: "https://store.fluxinc.ca" },
    ],

    sidebar: [
      {
        text: "Products",
        items: [
          {
            text: "DICOM Capacitor",
            link: "/dicom-capacitor/",
            collapsed: false,
            items: [
              { text: "Overview", link: "/dicom-capacitor/index.md" },
              { text: "Installation", link: "/dicom-capacitor/installation" },
              { text: "Docker", link: "/dicom-capacitor/docker" },
              { text: "Command Line Options", link: "/dicom-capacitor/command-line" },
              {
                text: "Configuration",
                link: "/dicom-capacitor/configuration",
                items: [
                  {
                    text: "Settings",
                    link: "/dicom-capacitor/config",
                  },
                  {
                    text: "Nodes",
                    link: "/dicom-capacitor/nodes",
                  },
                  {
                    text: "Filters",
                    link: "/dicom-capacitor/filters/",
                    items: [
                      {
                        text: "Route",
                        link: "/dicom-capacitor/filters/route",
                      },
                      {
                        text: "Mutate",
                        link: "/dicom-capacitor/filters/mutate",
                      },
                      {
                        text: "Sort",
                        link: "/dicom-capacitor/filters/sort",
                      },
                      {
                        text: "Lua",
                        link: "/dicom-capacitor/filters/lua",
                      },
                      {
                        text: "Filter Conditions",
                        link: "/dicom-capacitor/filters/conditions",
                      }
                    ],
                  },
                ],
              },
              {
                text: "Worklist Pre-Fetch",
                link: "/dicom-capacitor/prefetch",
              },
              {
                text: "Starting and Stopping the Service",
                link: "/dicom-capacitor/starting-and-stopping",
              },
              {
                text: "Web Dashboard",
                link: "/dicom-capacitor/web-ui",
              },
              {
                text: "HTTP API",
                link: "/dicom-capacitor/api",
              },
              {
                text: "Manipulating the Cache",
                link: "/dicom-capacitor/cache",
              },
              {
                text: "Interrogating the Logs",
                link: "/dicom-capacitor/logs",
              },
              {
                text: "Uninstallation",
                link: "/dicom-capacitor/uninstallation",
              },
              { text: "Upgrading", link: "/dicom-capacitor/upgrading" },
              { text: "Support", link: "/dicom-capacitor/support" },
              { text: "License", link: "/dicom-capacitor/license" },
            ],
          },
          {
            text: "DICOM Printer 2",
            link: "/dicom-printer-2/",
            collapsed: true,
            items: [
              { text: "Overview", link: "/dicom-printer-2/index.md" },
              { text: "Architecture & Design", link: "/dicom-printer-2/architecture" },
              { text: "Installation", link: "/dicom-printer-2/installation" },
              { text: "Command Line Options", link: "/dicom-printer-2/command-line" },
              {
                text: "Configuration",
                link: "/dicom-printer-2/configuration",
                items: [
                  { text: "Configuration Reference", link: "/dicom-printer-2/config" },
                  {
                    text: "Actions",
                    link: "/dicom-printer-2/actions/",
                    items: [
                      { text: "Query", link: "/dicom-printer-2/actions/query" },
                      { text: "Query Attributes", link: "/dicom-printer-2/actions/query-attributes" },
                      { text: "Store", link: "/dicom-printer-2/actions/store" },
                      { text: "Print", link: "/dicom-printer-2/actions/print" },
                      { text: "Parse", link: "/dicom-printer-2/actions/parse" },
                      { text: "SetTag", link: "/dicom-printer-2/actions/settag" },
                      { text: "SetSequence", link: "/dicom-printer-2/actions/setsequence" },
                      { text: "Save", link: "/dicom-printer-2/actions/save" },
                      { text: "Image Manipulation", link: "/dicom-printer-2/actions/image-manipulation" },
                      { text: "Run (Plugins)", link: "/dicom-printer-2/actions/run" },
                      { text: "Notify", link: "/dicom-printer-2/actions/notify" }
                    ]
                  },
                  {
                    text: "Workflow",
                    link: "/dicom-printer-2/workflow/",
                    items: [
                      { text: "Conditional Nodes", link: "/dicom-printer-2/workflow/conditional-nodes" },
                      { text: "Control Nodes", link: "/dicom-printer-2/workflow/control-nodes" }
                    ]
                  },
                  { text: "Placeholders", link: "/dicom-printer-2/placeholders" }
                ]
              },
              { text: "Drop Monitor", link: "/dicom-printer-2/drop-monitor" },
              { text: "Control Application", link: "/dicom-printer-2/control-app" },
              { text: "Queue Dashboard", link: "/dicom-printer-2/queue-dashboard" },
              { text: "Licensing and Activation", link: "/dicom-printer-2/licensing" },
              { text: "Starting and Stopping the Service", link: "/dicom-printer-2/starting-and-stopping" },
              { text: "Interrogating the Logs", link: "/dicom-printer-2/logs" },
              { text: "Troubleshooting", link: "/dicom-printer-2/troubleshooting" },
              { text: "Uninstallation", link: "/dicom-printer-2/uninstallation" },
              { text: "Upgrading", link: "/dicom-printer-2/upgrading" },
              { text: "Support", link: "/dicom-printer-2/support" },
              { text: "License", link: "/dicom-printer-2/license" },
              { text: "DICOM Conformance Statement", link: "/dicom-printer-2/conformance" }
            ]
          },
        ],
      },
    ],
  },
});
