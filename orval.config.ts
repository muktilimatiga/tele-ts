import { defineConfig } from "orval";

export default defineConfig({
  api: {
    // ⬇️ CHANGE THIS to your OpenAPI spec path or URL
    input: {
      target: "http://localhost:8002/openapi.json",
      filters: {
        tags: [
          "bot", "Bot",
          "customer", "Customer",
          "ticket", "Ticket",
          "config", "Config",
          "cli", "Cli",
          "ocr", "Ocr",
          "file", "File",
          "default", "Default"
        ],
      },
    },

    output: {
      mode: "tags-split", // generates one file per tag
      target: "./src/api/generated",
      schemas: "./src/api/generated/models",
      client: "axios",
      clean: true, // cleans output folder before generating

      override: {
        mutator: {
          path: "./src/api/custom_instance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
