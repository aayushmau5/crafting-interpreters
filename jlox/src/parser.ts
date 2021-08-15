/*
expression -> equality
equality (== !=) -> comparison ( ("!=" | "==") comparison )* ;
comparison (< <= > >=) -> term ( ("<" | "<=" | ">" | ">=") term )* ;
term (- +) -> factor ( ("-" | "+") factor )* ;
factor (/ *) -> unary ( ("/" | "*") unary )* ;
unary (! -) -> ("!" | "-") unary | primary;
primary (Literals or parenthezised expressions) -> NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" ;
*/

import { Binary, Expr, Grouping, Literal, Unary } from "./ast";
import { TokenType, Token } from "./token";
import { Lox } from "./main";
import { ParseError } from "./errors";

export class Parser {
  private tokens: Token[];
  private current: number = 0; // the current points to the next token waiting to be parsed

  constructor(tokens: Token[]) {
    // takes a sequence of tokens
    // just like parser takes a sequence of characters
    this.tokens = tokens;
  }

  parse(): Expr | null {
    try {
      return this.expression();
    } catch (err) {
      return null;
    }
  }

  // the expression grammar rule
  // expression -> equality
  private expression() {
    return this.equality(); // calls the equality rule
  }

  // the equality rule
  // equality -> comparison ( ("!=" | "==") comparison )* ;
  private equality(): Expr {
    let expr: Expr = this.comparsion();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      // run as long as we get the != or == tokens
      const operator: Token = this.previous();
      const right: Expr = this.comparsion();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  // the comparison rule
  // comparison -> term ( ("<" | "<=" | ">" | ">=") term )* ;
  private comparsion(): Expr {
    let expr: Expr = this.term();

    while (
      this.match(
        TokenType.LESS,
        TokenType.LESS_EQUAL,
        TokenType.GREATER,
        TokenType.GREATER_EQUAL
      )
    ) {
      const operator: Token = this.previous();
      const right: Expr = this.term();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  // the term rule
  //term -> factor ( ("-" | "+") factor )* ;
  private term(): Expr {
    let expr: Expr = this.factor();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator: Token = this.previous();
      const right: Expr = this.factor();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  // the factor rule
  // factor -> unary ( ("/" | "*") unary )* ;
  private factor(): Expr {
    let expr: Expr = this.unary();

    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator: Token = this.previous();
      const right: Expr = this.unary();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  // the unary rule
  // unary -> ("!" | "-") unary | primary;
  private unary(): Expr {
    if (this.match(TokenType.MINUS, TokenType.BANG)) {
      const operator = this.previous();
      const right = this.unary();
      return new Unary(operator, right);
    }

    return this.primary();
  }

  // the primary rule
  // primary (Literals or parenthezised expressions) -> NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" ;
  private primary(): Expr {
    if (this.match(TokenType.TRUE)) return new Literal(true);
    if (this.match(TokenType.FALSE)) return new Literal(false);
    if (this.match(TokenType.NIL)) return new Literal(null);

    if (this.match(TokenType.STRING, TokenType.NUMBER)) {
      return new Literal(this.previous().literal);
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new Grouping(expr);
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw this.error(this.peek(), message);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        // checks if the current token has any of the given types
        this.advance();
        return true;
      }
    }

    return false;
  }

  private check(type: TokenType): boolean {
    // checks if the currrent token is of the given type
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    // advance to the next token
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    // current token we have yet to consume
    return this.tokens[this.current];
  }

  private previous(): Token {
    // the most recently consumed token
    return this.tokens[this.current - 1];
  }

  private error(token: Token, message: string): ParseError {
    Lox.parseError(token, message);
    return new ParseError(message);
  }

  private synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUN:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }
      this.advance();
    }
  }
}
