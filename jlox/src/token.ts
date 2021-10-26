export enum TokenType {
  // Single-character tokens.
  LEFT_PAREN = "leftParen",
  RIGHT_PAREN = "rightParen",
  LEFT_BRACE = "leftBrace",
  RIGHT_BRACE = "rightBrace",
  COMMA = "comma",
  DOT = "dot",
  MINUS = "minus",
  PLUS = "plus",
  SEMICOLON = "semicolon",
  SLASH = "slash",
  STAR = "star",

  // One or two character tokens.
  BANG = "bang",
  BANG_EQUAL = "bangEqual",
  EQUAL = "equal",
  EQUAL_EQUAL = "equalEqual",
  GREATER = "greater",
  GREATER_EQUAL = "greaterEqual",
  LESS = "less",
  LESS_EQUAL = "lessEqual",

  // Literals.
  IDENTIFIER = "identifier",
  STRING = "string",
  NUMBER = "number",

  // Keywords.
  AND = "and",
  CLASS = "class",
  ELSE = "else",
  FALSE = "false",
  FUN = "fun",
  FOR = "for",
  IF = "if",
  NIL = "nil",
  OR = "or",
  PRINT = "print",
  RETURN = "return",
  SUPER = "super",
  THIS = "this",
  TRUE = "true",
  VAR = "var",
  WHILE = "while",

  EOF = "eof",
}

export class Token {
  type: TokenType;
  lexeme: string;
  literal: any;
  line: number;

  constructor(type: TokenType, lexeme: string, literal: any, line: number) {
    this.type = type;
    this.lexeme = lexeme;
    this.literal = literal;
    this.line = line;
  }

  toString() {
    return `${this.type} - ${this.lexeme} - ${this.literal}`;
  }
}
