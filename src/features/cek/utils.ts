/**
 * Utility functions for cek feature
 */

/**
 * Clean ONU output - remove OLT prompts and trim whitespace
 */
export function cleanOnuOutput(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trim().match(/^[A-Z0-9-]+#$/)) // Remove OLT prompt lines like "LX-OLT-DURENAN#"
    .filter((line) => !line.trim().match(/^show\s+/i)) // Remove "show ..." command lines
    .join("\n")
    .trim();
}

/**
 * Parse and split ONU result into detail and attenuation sections
 */
export function parseOnuResult(rawResult: string): {
  detail: string;
  attenuation: string;
} {
  // Find the attenuation section marker
  const attenuationMarkers = [
    "OLT                  ONU              Attenuation",
    "Attenuation",
  ];
  let attenuationIndex = -1;

  for (const marker of attenuationMarkers) {
    const idx = rawResult.indexOf(marker);
    if (idx !== -1) {
      // Find the line that starts with "show pon power" before the attenuation table
      const showPonIndex = rawResult.lastIndexOf("show pon power", idx);
      if (showPonIndex !== -1) {
        attenuationIndex = showPonIndex;
      } else {
        attenuationIndex = idx;
      }
      break;
    }
  }

  if (attenuationIndex === -1) {
    // No attenuation data found, return all as detail
    return {
      detail: cleanOnuOutput(rawResult),
      attenuation: "",
    };
  }

  const detailPart = rawResult.substring(0, attenuationIndex);
  const attenuationPart = rawResult.substring(attenuationIndex);

  return {
    detail: cleanOnuOutput(detailPart),
    attenuation: cleanOnuOutput(attenuationPart),
  };
}

/**
 * Split long messages into chunks that fit Telegram's 4096 character limit
 * Splits at newlines to preserve formatting
 */
export function splitLongMessage(text: string, maxLength = 4000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const lines = text.split("\n");
  let currentChunk = "";

  for (const line of lines) {
    // If adding this line would exceed the limit
    if ((currentChunk + "\n" + line).length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // If a single line is too long, force split it
      if (line.length > maxLength) {
        for (let i = 0; i < line.length; i += maxLength) {
          chunks.push(line.substring(i, i + maxLength));
        }
        currentChunk = "";
      } else {
        currentChunk = line;
      }
    } else {
      currentChunk = currentChunk ? currentChunk + "\n" + line : line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
