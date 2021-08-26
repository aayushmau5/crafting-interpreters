/*
program        → statement* EOF ;
statement      → exprStmt | printStmt ;
exprStmt       → expression ";" ;
printStmt      → "print" expression ";" ;
expression -> equality ;
equality (== !=) -> comparison ( ("!=" | "==") comparison )* ;
comparison (< <= > >=) -> term ( ("<" | "<=" | ">" | ">=") term )* ;
term (- +) -> factor ( ("-" | "+") factor )* ;
factor (/ *) -> unary ( ("/" | "*") unary )* ;
unary (! -) -> ("!" | "-") unary | primary;
primary (Literals or parenthesized expressions) -> NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" ;


a program is a list of statements
*/

import {
  Binary,
  Expr,
  Expression,
  Grouping,
  Literal,
  Print,
  Stmt,
  Unary,
} from "./ast";
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

  // a program is a list of statements
  // the program rule
  // program -> statement* EOF;
  parse(): Stmt[] {
    const statements: Stmt[] = [];
    // EOF
    while (!this.isAtEnd()) {
      statements.push(this.statement());
    }

    return statements;
  }

  // the statement rule
  // statment -> expression statement | print statement
  private statement(): Stmt {
    if (this.match(TokenType.PRINT)) {
      return this.printStatement(); // if "print" found
    }
    return this.expressionStatement();
  }

  // the print statement rule
  // printStmt      → "print" expression ";" ;
  private printStatement(): Stmt {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new Print(value);
  }

  // the expression statement rule
  // exprStmt       → expression ";" ;
  private expressionStatement(): Stmt {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new Expression(expr);
  }

  // the expression grammar rule
  // expression -> equality
  private expression() {
    return this.equality(); // calls the equality rule
  }

  // the equality rule
  // equality -> comparison ( ("!=" | "==") comparison )* ;
  private equality(): Expr {
    let expr: Expr = this.comparison();

    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      // run as long as we get the != or == tokens
      const operator: Token = this.previous();
      const right: Expr = this.comparison();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  // the comparison rule
  // comparison -> term ( ("<" | "<=" | ">" | ">=") term )* ;
  private comparison(): Expr {
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
  // primary (Literals or parenthesized expressions) -> NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" ;
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
    // checks if the current token is of the given type
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
