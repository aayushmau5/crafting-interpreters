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
*/

import { Token } from "./token";

export interface Visitor<R> {
  visitBinaryExpr(expr: Binary): R;
  visitGroupingExpr(expr: Grouping): R;
  visitLiteralExpr(expr: Literal): R;
  visitUnaryExpr(expr: Unary): R;
}

export interface Expr {
  accept<R>(visitor: Visitor<R>): R;
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
  expresion: Expr;
  constructor(expression: Expr) {
    this.expresion = expression;
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
