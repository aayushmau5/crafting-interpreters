/*
----- Lowest Precedence ----
expression -> equality (same as equality and all below)
equality (== !=) -> comparison ( ("!=" | "==") comparison )* ;
comparison (< <= > >=) -> term ( ("<" | "<=" | ">" | ">=") term )* ;
term (- +) -> factor ( ("-" | "+") factor )* ;
factor (/ *) -> unary ( ("/" | "*") unary )* ;
unary (! -) -> ("!" | "-") unary | primary;
primary (Literals or parenthezised expressions) -> NUMBER | STRING | "true" | "false" | "nil" | "(" expression ")" ;
----- Highest Precedence ----

Recursive descent (A parsing technique)
  used in GCC, V8, Roslyn(C# compiler)

top-down parser
  Starts from the top or outermost grammar rule and works its way down into the nested subexpressions.

two simplest types of statements:
1. Expression statement
2. print statement

program        → statement* EOF ;
statement      → exprStmt | printStmt ;
exprStmt       → expression ";" ;
printStmt      → "print" expression ";" ;
*/

import { Token } from "./token";

export interface Visitor<R> {
  visitBinaryExpr(expr: Binary): R;
  visitGroupingExpr(expr: Grouping): R;
  visitLiteralExpr(expr: Literal): R;
  visitUnaryExpr(expr: Unary): R;
  visitVariableExpr(expr: Variable): R;
}

export interface StmtVisitor<R> {
  visitExpressionStmt(expr: Expression): R;
  visitPrintStmt(expr: Print): R;
  visitVarStmt(expr: Var): R;
}

export interface Expr {
  accept<R>(visitor: Visitor<R>): R;
}

export interface Stmt {
  accept<R>(visitor: StmtVisitor<R>): R;
}

export class Binary implements Expr {
  left: Expr;
  operator: Token;
  right: Expr;
  constructor(left: Expr, operator: Token, right: Expr) {
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitBinaryExpr(this);
  }
}

export class Grouping implements Expr {
  expression: Expr;
  constructor(expression: Expr) {
    this.expression = expression;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitGroupingExpr(this);
  }
}

export class Literal implements Expr {
  value: any;
  constructor(value: any) {
    this.value = value;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitLiteralExpr(this);
  }
}

export class Unary implements Expr {
  operator: Token;
  right: Expr;
  constructor(operator: Token, right: Expr) {
    this.operator = operator;
    this.right = right;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitUnaryExpr(this);
  }
}

export class Expression implements Stmt {
  expression: Expr;
  constructor(expression: Expr) {
    this.expression = expression;
  }

  accept<R>(visitor: StmtVisitor<R>) {
    return visitor.visitExpressionStmt(this);
  }
}

export class Print implements Stmt {
  expression: Expr;
  constructor(expression: Expr) {
    this.expression = expression;
  }

  accept<R>(visitor: StmtVisitor<R>) {
    return visitor.visitPrintStmt(this);
  }
}

export class Var implements Stmt {
  // declaraing a variable is a statement. ex. var a = "a";
  // for declaring a variable
  name: Token;
  initializer: Expr | null; // default value will be null
  constructor(name: Token, initializer: Expr | null = null) {
    this.name = name;
    this.initializer = initializer;
  }

  accept<R>(visitor: StmtVisitor<R>) {
    return visitor.visitVarStmt(this);
  }
}

export class Variable implements Expr {
  // accessing a variable is an expression. ex. a + "b";
  // for accessing a variable
  name: Token;
  constructor(name: Token) {
    this.name = name;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitVariableExpr(this);
  }
}
