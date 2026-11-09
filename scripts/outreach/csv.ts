export type Row = Record<string, string>;

export function parseCsv(text: string): Row[] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }

  const [header, ...rows] = records;
  return rows
    .filter((row) => row.length > 1)
    .map((row) => Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""])));
}

export function toCsv(rows: Record<string, string | number>[]): string {
  const quote = (value: string | number) => {
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const header = Object.keys(rows[0] ?? {});
  return [header, ...rows.map((row) => header.map((key) => row[key]))]
    .map((row) => row.map(quote).join(","))
    .join("\n");
}
