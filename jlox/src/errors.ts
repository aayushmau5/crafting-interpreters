import { Token } from "./token";

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

export class RuntimeError extends Error {
  name = "RuntimeError";
  token: Token;

  constructor(token: Token, message: string) {
    super(message);
    this.token = token;
  }
}
