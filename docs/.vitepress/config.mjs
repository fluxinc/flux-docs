import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Flux Docs",
  description: "Documentation for our Products",
  base: "/",
  themeConfig: {
    logo: "/logo.svg",
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      {
        text: "DICOM Capacitor",
        link: "/dicom-capacitor",
      },
      { text: "DICOM Printer", link: "/dicom-printer-2" },
      { text: "Buy", link: "https://store.fluxinc.ca" },
    ],

    sidebar: [
      {
        text: "Products",
        items: [
          {
            text: "DICOM Capacitor",
            link: "/dicom-capacitor",
            items: [
              { text: "Overview", link: "/dicom-capacitor/overview" },
              { text: "Installation", link: "/dicom-capacitor/installation" },
              { text: "Docker", link: "/dicom-capacitor/docker" },
              { text: "Command Line Options", link: "/dicom-capacitor/command-line" },
              {
                text: "Configuration",
                link: "/dicom-capacitor/configuration",
                items: [
                  {
                    text: "config.yml",
                    link: "/dicom-capacitor/configuration#config-yml",
                  },
                  {
                    text: "nodes.yml",
                    link: "/dicom-capacitor/configuration#nodes-yml",
                  },
                  {
                    text: "Filters",
                    link: "/dicom-capacitor/filters",
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
                        text: "Filter Conditions",
                        link: "/dicom-capacitor/filters/conditions",
                      }
                    ],
                  },
                ],
              },
              {
                text: "Starting and Stopping the Service",
                link: "/dicom-capacitor/starting-and-stopping",
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
              { text: "Examples", link: "/dicom-capacitor/examples" },
            ],
          },
          { text: "DICOM Printer 2", link: "/dicom-printer-2" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
