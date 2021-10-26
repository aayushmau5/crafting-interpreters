/*
program        → declaration* EOF ;
declaration    → classDecl | funcDecl | varDecl | statement ;
classDecl      → "class" IDENTIFIER ( "<" IDENTIFIER )? "{" function* "}" ;
funcDecl       → "fun" function;
function       → IDENTIFIER "(" parameters? ")" block ;
parameters     → IDENTIFIER ( "," IDENTIFIER )* ;
varDecl        → "var" IDENTIFIER ("=" expression)? ";" ;
statement      → exprStmt | forStmt | ifStmt | printStmt | returnStmt | whileStmt | block ;
returnStmt     → "return" expression? ";" ;
forStmt        → "for" "(" ( varDecl | exprStmt | ";" ) expression? ";" expression? ")" statement;
whileStmt      → "while" "(" expression ")" statement ;
ifStmt         → "if" "(" expression ")" statement ( "else" statement )? ;
block          → "{" declaration* "}" ;
exprStmt       → expression ";" ;
printStmt      → "print" expression ";" ;
expression     → equality ;
equality (== !=) → comparison ( ("!=" | "==") comparison )* ;
comparison (< <= > >=) → term ( ("<" | "<=" | ">" | ">=") term )* ;
term (- +)     → factor ( ("-" | "+") factor )* ;
factor (/ *)   → unary ( ("/" | "*") unary )* ;
unary (! -)    → ("!" | "-") unary | call ;
call           → primary ( "(" arguments? ")" | "." IDENTIFIER )* ;
arguments      → expression ( "," expression )* ;
primary (Literals or parenthesized expressions) → NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" | IDENTIFIER | "this" | "super" "." IDENTIFIER ;

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

Conditional execution or Control flow

Control flow(two types):
1. Conditional or branching control flow
2. Looping control flow

Branching control flow using `if` and `?:`
An `if` statement lets you conditionally execute statemensts
and the conditional operators lets you conditionally execute expressions.

The `else` is bound to the nearest `if` that precedes(to happen before something) it.

The logical operators: `and` and `or` are technically control flow constructs.

Property access("get expressions")
*/

import {
  Assign,
  Binary,
  Block,
  Call,
  Class,
  Expr,
  Expression,
  Function,
  Get,
  Grouping,
  If,
  Literal,
  Logical,
  Print,
  Return,
  Set,
  Stmt,
  Super,
  This,
  Unary,
  Var,
  Variable,
  While,
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
    if (this.match(TokenType.CLASS)) {
      return this.classDeclaration();
    }
    if (this.match(TokenType.VAR)) {
      return this.varDeclaration();
    }
    if (this.match(TokenType.FUN)) {
      return this.functionDeclaration("function");
    }
    return this.statement();
  }

  private classDeclaration(): Stmt {
    const name = this.consume(TokenType.IDENTIFIER, "Expect class name."); // the class name

    let superclass = null;
    if (this.match(TokenType.LESS)) {
      this.consume(TokenType.IDENTIFIER, "Expect superclass name.");
      superclass = new Variable(this.previous());
    }

    this.consume(TokenType.LEFT_BRACE, "Expect '{' before class body."); // consumes the {
    const methods: Function[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      // if we don't find } and it isn't the end of the file
      // we consume methods inside functions
      methods.push(this.functionDeclaration("method") as Function);
    }
    this.consume(TokenType.RIGHT_BRACE, "Expect '}' after class body."); // consumes the }
    return new Class(name, methods, superclass);
  }

  private functionDeclaration(kind: string): Stmt {
    const name = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);
    this.consume(TokenType.LEFT_PAREN, `Expect '(' after ${kind} name.`);
    const parameters = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (parameters.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 parameters.");
        }
        parameters.push(
          this.consume(TokenType.IDENTIFIER, "Expect parameter name.")
        );
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.");
    this.consume(TokenType.LEFT_BRACE, `Expect '{' before ${kind} body.`);
    const body = this.block();
    return new Function(name, parameters, body);
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
    if (this.match(TokenType.FOR)) {
      return this.forStatement(); // if "for" found
    }
    if (this.match(TokenType.IF)) {
      return this.ifStatement(); // if "if" found
    }
    if (this.match(TokenType.WHILE)) {
      // if "while" found
      return this.whileStatement();
    }
    if (this.match(TokenType.PRINT)) {
      return this.printStatement(); // if "print" found
    }
    if (this.match(TokenType.RETURN)) return this.returnStatement();
    if (this.match(TokenType.LEFT_BRACE)) {
      // if "{" found, start of a block statement
      return new Block(this.block());
    }
    return this.expressionStatement();
  }

  returnStatement(): Stmt {
    const token = this.previous();
    let value = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return new Return(token, value);
  }

  // the for statement rule
  // forStmt        → "for" "(" ( varDecl | exprStmt | ";" ) expression? ";" expression? ")" statement;
  private forStatement() {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'for'.");
    let initializer: Stmt | null;
    if (this.match(TokenType.SEMICOLON)) {
      initializer = null;
    } else if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }
    let condition: Expr | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");
    let increment: Expr | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      increment = this.expression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after for clauses.");
    let body = this.statement();

    if (increment !== null) {
      body = new Block([body, new Expression(increment)]);
    }

    if (condition === null) {
      condition = new Literal(true);
    }
    body = new While(condition, body);

    if (initializer !== null) {
      body = new Block([initializer, body]);
    }

    return body;
  }

  // the if statment rule
  // ifStmt         → "if" "(" expression ")" statement ( "else" statement )? ;
  // already handles the danling else problem
  private ifStatement() {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.");
    const thenBranch = this.statement();
    let elseBranch = null;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }
    return new If(condition, thenBranch, elseBranch);
  }

  // the while statement rule
  // whileStmt      → "while" "(" expression ")" statement ;
  private whileStatement() {
    this.consume(TokenType.LEFT_PAREN, "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expect ')' after condition.");
    const body = this.statement();
    return new While(condition, body);
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
    const expr = this.or();
    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();

      if (expr instanceof Variable) {
        const name = expr.name;
        return new Assign(name, value); // l-value representation
      } else if (expr instanceof Get) {
        // if we find `.` in the expr, then it's a Get expr
        // then we find `=`, thus converting Get expr into Set expr
        return new Set(expr.object, expr.name, value);
      }

      this.error(equals, "Invalid assignment target.");
    }
    return expr;
  }

  private or(): Expr {
    let expr = this.and();
    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new Logical(expr, operator, right);
    }
    return expr;
  }

  private and(): Expr {
    let expr = this.equality();
    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new Logical(expr, operator, right);
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

    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();
    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        // property access ex. something.some_property where `something` is the expr, and `some_property` is the name
        const name = this.consume(
          TokenType.IDENTIFIER,
          "Expect property name after '.' ."
        ); // property name
        expr = new Get(expr, name); // assuming it is a Get expression
      } else {
        break;
      }
    }

    return expr;
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

    if (this.match(TokenType.THIS)) {
      // matches `this`
      return new This(this.previous());
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new Variable(this.previous());
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.");
      return new Grouping(expr);
    }

    if (this.match(TokenType.SUPER)) {
      // matches super.some_method_name
      const keyword = this.previous();
      this.consume(TokenType.DOT, "Expect '.' after 'super'.");
      const method = this.consume(
        TokenType.IDENTIFIER,
        "Expect superclass method name."
      );
      return new Super(keyword, method);
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private finishCall(callee: Expr): Expr {
    const args = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        if (args.length >= 255) {
          this.error(this.peek(), "Can't have more than 255 arguments.");
        }
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    const leftParen = this.consume(
      TokenType.RIGHT_PAREN,
      "Expect ')' after arguments."
    );
    return new Call(callee, leftParen, args);
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
