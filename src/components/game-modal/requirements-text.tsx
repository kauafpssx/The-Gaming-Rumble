import translationsData from "@/lib/translations.json";

const _entries = Object.entries(translationsData.phrase_replacements)
  .sort((a, b) => b[0].length - a[0].length); // longest first to avoid partial replacements

function escRx(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyTranslations(text: string): string {
  let result = text;
  for (const [en, pt] of _entries) {
    result = result.replace(new RegExp(escRx(en), "gi"), pt);
  }
  return result;
}

const ALLOWED_LABELS = [
  /^(os|operating system|sistema operativ[ao])/i,
  /^(processor|processador|cpu)/i,
  /^(memory|mem[oó]ria|ram)/i,
  /^(graphics?(\s+card)?|placa\s+(gr[aá]fica|de\s+v[ií]deo)|gpu|video\s+card)/i,
  /^(storage|espa[cç]o\s+(no|em|livre\s+no)?\s*disco|disco\s+r[ií]gido|hard\s+(drive|disk))/i,
];

function isAllowedLabel(label: string) {
  return ALLOWED_LABELS.some((rx) => rx.test(label.trim()));
}

export function RequirementsText({ text }: { text: string }) {
  const cleaned = text
    .replace(/^Mínimos:\n\n/, "")
    .replace(/^Recomendados:\n\n/, "")
    .replace(/^Requer um sistema operativo e processador de 64 bits\n\n/, "")
    .replace(/^Requires a 64-bit processor and operating system\n\n/i, "")
    .trim();

  const translated = applyTranslations(cleaned);
  const lines = translated.split("\n").filter((l) => l.trim());

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const match = line.match(/^([^:]+?)(\s*\*?):\s*(.+)$/);
        if (!match || !isAllowedLabel(match[1])) return null;
        return (
          <div key={i} className="text-xs leading-relaxed">
            <span className="font-semibold text-foreground/90">
              {match[1].trim()}{match[2]}:
            </span>{" "}
            <span className="text-muted-foreground">{match[3]}</span>
          </div>
        );
      })}
    </div>
  );
}
