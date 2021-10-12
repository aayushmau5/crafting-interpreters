/*
----- Lowest Precedence ----
expression -> assignment ;
assignment -> (call ".")? IDENTIFIER "=" assignment | logic_or ;
logic_or -> logic_and ( "or" logic_and )* ;
logic_and -> equality ( "and" equality )* ;
equality (== !=) -> comparison ( ("!=" | "==") comparison )* ;
comparison (< <= > >=) -> term ( ("<" | "<=" | ">" | ">=") term )* ;
term (- +) -> factor ( ("-" | "+") factor )* ;
factor (/ *) -> unary ( ("/" | "*") unary )* ;
unary (! -) -> ("!" | "-") unary | call ;
call -> primary ( "(" arguments? ")" | "." IDENTIFIER )* ;
arguments      → expression ( "," expression )* ;
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
  visitAssignExpr(expr: Assign): R;
  visitLogicalExpr(expr: Logical): R;
  visitCallExpr(expr: Call): R;
  visitGetExpr(expr: Get): R;
  visitSetExpr(expr: Set): R;
  visitThisExpr(expr: This): R;
}

export interface StmtVisitor<R> {
  visitExpressionStmt(expr: Expression): R;
  visitPrintStmt(expr: Print): R;
  visitVarStmt(expr: Var): R;
  visitBlockStmt(expr: Block): R;
  visitIfStmt(expr: If): R;
  visitWhileStmt(expr: While): R;
  visitFunctionStmt(expr: Function): R;
  visitReturnStmt(expr: Return): R;
  visitClassStmt(expr: Class): R;
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

export class Call implements Expr {
  callee: Expr;
  paren: Token; // for closing parenthesis. This token's location will be used to report runtime error location caused by a function call
  args: Expr[];
  constructor(callee: Expr, paren: Token, args: Expr[]) {
    this.callee = callee;
    this.paren = paren;
    this.args = args;
  }

  accept<R>(v: Visitor<R>) {
    return v.visitCallExpr(this);
  }
}

export class Get implements Expr {
  // to get a property from an instance. ex. something.some_property
  object: Expr; // the object upon which we will access a property
  name: Token; // the name of the property
  constructor(object: Expr, name: Token) {
    this.object = object;
    this.name = name;
  }

  accept<R>(v: Visitor<R>) {
    return v.visitGetExpr(this);
  }
}

export class Set implements Expr {
  // to set a property in an instance. ex. something.some_property = some_value
  object: Expr;
  name: Token;
  value: Expr;

  constructor(object: Expr, name: Token, value: Expr) {
    this.object = object;
    this.name = name;
    this.value = value;
  }

  accept<R>(v: Visitor<R>) {
    return v.visitSetExpr(this);
  }
}

export class This implements Expr {
  // for `this` access on class methods
  keyword: Token;
  constructor(keyword: Token) {
    this.keyword = keyword;
  }

  accept<R>(v: Visitor<R>) {
    return v.visitThisExpr(this);
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

export class Logical implements Expr {
  left: Expr;
  operator: Token; // "and" or "or"
  right: Expr;
  constructor(left: Expr, operator: Token, right: Expr) {
    this.left = left;
    this.operator = operator;
    this.right = right;
  }

  accept<R>(v: Visitor<R>) {
    return v.visitLogicalExpr(this);
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

export class Class implements Stmt {
  name: Token;
  methods: Function[];
  constructor(name: Token, methods: Function[]) {
    this.name = name;
    this.methods = methods;
  }

  accept<R>(v: StmtVisitor<R>) {
    return v.visitClassStmt(this);
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

export class Function implements Stmt {
  name: Token;
  params: Token[];
  body: Stmt[];
  constructor(name: Token, params: Token[], body: Stmt[]) {
    this.name = name;
    this.params = params;
    this.body = body;
  }

  accept<R>(v: StmtVisitor<R>) {
    return v.visitFunctionStmt(this);
  }
}

export class If implements Stmt {
  condition: Expr;
  thenBranch: Stmt;
  elseBranch: Stmt | null;
  constructor(condition: Expr, thenBranch: Stmt, elseBranch: Stmt | null) {
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }

  accept<R>(v: StmtVisitor<R>) {
    return v.visitIfStmt(this);
  }
}

export class While implements Stmt {
  condition: Expr;
  body: Stmt;
  constructor(condition: Expr, body: Stmt) {
    this.condition = condition;
    this.body = body;
  }
  accept<R>(v: StmtVisitor<R>) {
    return v.visitWhileStmt(this);
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

export class Return implements Stmt {
  constructor(public keyword: Token, public value: Expr | null) {}

  accept<R>(v: StmtVisitor<R>) {
    return v.visitReturnStmt(this);
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

export class Assign implements Expr {
  // for assignment. ex. a = "a";
  name: Token;
  value: Expr;

  constructor(name: Token, value: Expr) {
    this.name = name;
    this.value = value;
  }

  accept<R>(visitor: Visitor<R>) {
    return visitor.visitAssignExpr(this);
  }
}

export class Block implements Stmt {
  statements: Stmt[]; // list of statements that are inside the block
  constructor(statements: Stmt[]) {
    this.statements = statements;
  }

  accept<R>(visitor: StmtVisitor<R>) {
    return visitor.visitBlockStmt(this);
  }
}
