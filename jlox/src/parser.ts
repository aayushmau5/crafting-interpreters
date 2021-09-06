/*
program        → declaration* EOF ;
declaration    → varDecl | statement;
varDecl        → "var" IDENTIFIER ("=" expression)? ";" ;
statement      → exprStmt | printStmt | block ;
block          → "{" declaration* "}" ;
exprStmt       → expression ";" ;
printStmt      → "print" expression ";" ;
expression -> equality ;
equality (== !=) -> comparison ( ("!=" | "==") comparison )* ;
comparison (< <= > >=) -> term ( ("<" | "<=" | ">" | ">=") term )* ;
term (- +) -> factor ( ("-" | "+") factor )* ;
factor (/ *) -> unary ( ("/" | "*") unary )* ;
unary (! -) -> ("!" | "-") unary | primary;
primary (Literals or parenthesized expressions) -> NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" | IDENTIFIER ;


a program is a list of statements

var message = "hello, world";

-> a new binding that associates a name(message) with a value("hello, world")

variable expression access that binding
identifier(message) used as an expression
looks up value bound to that name

Variable declarations are statements
'var message = "hello, world";' is a statement

block statements

statements that declare names

In some other languages,  like pascal, python and Go, assignment is a statment.
But in some other languages, assignment is an expression.

For lox, assignment is an expression.
*/

import {
  Assign,
  Binary,
  Block,
  Expr,
  Expression,
  Grouping,
  Literal,
  Print,
  Stmt,
  Unary,
  Var,
  Variable,
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
      try {
        statements.push(this.declaration());
      } catch (error) {
        this.synchronize();
      }
    }

    return statements;
  }

  // the declaration rule
  // declaration    → varDecl | statement;
  private declaration(): Stmt {
    if (this.match(TokenType.VAR)) {
      return this.varDeclaration();
    }
    return this.statement();
  }

  private varDeclaration(): Stmt {
    const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.");
    let initializer: Expr | null = null;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }

    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
    return new Var(name, initializer);
  }

  // the statement rule
  // statment -> expression statement | print statement
  private statement(): Stmt {
    if (this.match(TokenType.PRINT)) {
      return this.printStatement(); // if "print" found
    }
    if (this.match(TokenType.LEFT_BRACE)) {
      // if "{" found, start of a block statement
      return new Block(this.block());
    }
    return this.expressionStatement();
  }

  // the block statment rule
  // block          → "{" declaration* "}" ;
  private block(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }
    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
    return statements;
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
    return this.assignment(); // calls the assignment rule
  }

  private assignment(): Expr {
    const expr = this.equality(); // r-value expression
    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof Variable) {
        const name = expr.name;
        return new Assign(name, value); // l-value representation
      }

      this.error(equals, "Invalid assignment target.");
    }
    return expr;
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

    if (this.match(TokenType.IDENTIFIER)) {
      return new Variable(this.previous());
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
