import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Flux Docs",
  description: "Documentation for our Products",
  base: "/",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      {
        text: "DICOM Capacitor",
        link: "/dicom-capacitor",
      },
      { text: "DICOM Printer", link: "/dicom-printer-2" },
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
              { text: "Command Line", link: "/dicom-capacitor/command-line" },
              {
                text: "Configuration", link: "/dicom-capacitor/configuration",
                items: [
                  { text: "config.yml", link: "/dicom-capacitor/configuration#config-yml" },
                  { text: "nodes.yml", link: "/dicom-capacitor/configuration#nodes-yml" },
                ]
              },
              {
                text: "Starting and Stopping the Service",
                link: "/dicom-capacitor/starting-and-stoppping",
              },
              {
                text: "Manipulating the Cache",
                link: "/dicom-capacitor/manipulating-the-cache",
              },
              {
                text: "Interrogating the Logs",
                link: "/dicom-capacitor/interrogating-the-logs",
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
          { text: "DICOM Printer 2", link: "/dicom-printer-2" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
