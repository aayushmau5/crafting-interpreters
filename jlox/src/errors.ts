export class SyntaxError extends Error {
  name = "SyntaxError";
  message: string;
  line: number;
  where: string;

  constructor(line: number, where: string, message: string) {
    super();
    this.message = message;
    this.line = line;
    this.where = where;
  }
}

export class ParseError extends Error {}
