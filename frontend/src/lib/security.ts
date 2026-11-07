/**
 * Medical & Enterprise CSV Sanitization Engine (CWE-1236 & OWASP Formula Injection Defense)
 * Prevents execution of malicious DDE commands (=cmd, @SUM, +calc, -cmd, \t, \r)
 * when CSV audit files are opened in Microsoft Excel, LibreOffice Calc, or Google Sheets.
 */
export function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // 1. Strip null bytes and collapse carriage returns / newlines into safe single space
  str = str.replace(/\0/g, '').replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ');

  // 2. Check for formula trigger characters: '=', '+', '-', '@', '\t', '\r', '%'
  const trimmed = str.trimStart();
  const isFormulaTrigger = /^[=+\-@\t\r%]/.test(trimmed);

  if (isFormulaTrigger) {
    // Escape formula trigger by prepending a single quote (')
    // In spreadsheet engines (Excel, Calc), a leading single quote forces the cell
    // to be treated strictly as literal plain text, neutralizing formula execution.
    str = `'${str}`;
  }

  // 3. RFC 4180 compliance: Escape embedded double quotes by doubling them
  const escaped = str.replace(/"/g, '""');

  return `"${escaped}"`;
}
