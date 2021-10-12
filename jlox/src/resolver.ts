import {
  Assign,
  Block,
  Expr,
  Stmt,
  StmtVisitor,
  Var,
  Variable,
  Visitor,
  Function,
  Expression,
  If,
  Print,
  Return,
  While,
  Binary,
  Call,
  Grouping,
  Literal,
  Logical,
  Unary,
  Class,
  Get,
  Set,
  This,
} from "./ast";
import { Interpreter } from "./interpreter";
import { Lox } from "./main";
import { Token } from "./token";

type Scope = Record<string, boolean>;

enum FunctionType {
  None = "None",
  Function = "Function", // whether it's a standalone function
  Method = "Method", // or a method inside a class
  Initializer = "Initializer", // an initializer of a class
}

enum ClassType {
  None = "None",
  Class = "Class",
}

class ScopeStack extends Array<Scope> {
  isEmpty(): boolean {
    return this.length < 1;
  }

  peek(): Scope {
    return this[this.length - 1];
  }
}

export class Resolver implements Visitor<void>, StmtVisitor<void> {
  interpreter: Interpreter;
  scopes: ScopeStack = new ScopeStack();
  currentFunction = FunctionType.None; // indicates whether we are currently inside a function or not
  currentClass = ClassType.None; // indicates whether we are currently inside a class or not

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  visitBlockStmt(stmt: Block) {
    this.beginScope();
    this.resolve(stmt.statements);
    this.endScope();
    return;
  }

  visitVarStmt(stmt: Var) {
    this.declare(stmt.name);
    if (stmt.initializer !== null) {
      this.resolve(stmt.initializer);
    }
    this.define(stmt.name);
    return;
  }

  visitVariableExpr(expr: Variable) {
    if (
      this.scopes.isEmpty() &&
      this.scopes.peek()[expr.name.lexeme] === false
    ) {
      Lox.error(
        expr.name.line,
        "Can't read local variable in its own intializer"
      );
    }
    this.resolveLocal(expr, expr.name);
    return;
  }

  visitAssignExpr(expr: Assign) {
    this.resolve(expr.value);
    this.resolveLocal(expr, expr.name);
    return;
  }

  visitFunctionStmt(stmt: Function) {
    this.declare(stmt.name);
    this.define(stmt.name);
    this.resolveFunction(stmt, FunctionType.Function);
    return;
  }

  visitExpressionStmt(stmt: Expression) {
    this.resolve(stmt.expression);
    return;
  }

  visitIfStmt(stmt: If) {
    this.resolve(stmt.condition);
    this.resolve(stmt.thenBranch);
    if (stmt.elseBranch != null) this.resolve(stmt.elseBranch);
    return;
  }

  visitPrintStmt(stmt: Print) {
    this.resolve(stmt.expression);
    return;
  }

  visitReturnStmt(stmt: Return) {
    if (this.currentFunction === FunctionType.None) {
      Lox.error(stmt.keyword.line, "Can't return from top-level code.");
    }

    if (this.currentFunction === FunctionType.Initializer) {
      // if we see a `return` statement inside an initilizer, we throw an error
      Lox.error(stmt.keyword.line, "Can't return a value from an initializer.");
    }

    if (stmt.value !== null) {
      this.resolve(stmt.value);
    }
    return;
  }

  visitWhileStmt(stmt: While) {
    this.resolve(stmt.condition);
    this.resolve(stmt.body);
    return;
  }

  visitBinaryExpr(expr: Binary) {
    this.resolve(expr.left);
    this.resolve(expr.right);
    return;
  }

  visitCallExpr(expr: Call) {
    this.resolve(expr.callee);
    expr.args.forEach((arg) => this.resolve(arg));
    return;
  }

  visitGetExpr(expr: Get) {
    this.resolve(expr.object); // object is the instance which is being accessed upon ex. object.some_property
    // we are not resolving the property which we want to access because it is dynamically evaluated
    return;
  }

  visitSetExpr(expr: Set) {
    this.resolve(expr.value);
    this.resolve(expr.object);
    // resolving the instance and the RHS expr.
    // not resolving the property which will be accessed.
    return;
  }

  visitThisExpr(expr: This) {
    if (this.currentClass === ClassType.None) {
      // if we are not currently inside a class
      Lox.error(expr.keyword.line, "Can't use 'this' outside of a class.");
      return;
    }
    this.resolveLocal(expr, expr.keyword);
    return;
  }

  visitGroupingExpr(expr: Grouping) {
    this.resolve(expr.expression);
    return;
  }

  visitLiteralExpr(_expr: Literal) {
    return;
  }

  visitLogicalExpr(expr: Logical) {
    this.resolve(expr.left);
    this.resolve(expr.right);
    return;
  }

  visitUnaryExpr(expr: Unary) {
    this.resolve(expr.right);
    return;
  }

  visitClassStmt(stmt: Class) {
    const enclosingClass = this.currentClass;
    this.currentClass = ClassType.Class; // we are now inside a class

    this.declare(stmt.name);
    this.define(stmt.name);

    this.beginScope(); // add a new scope
    this.scopes.peek()["this"] = true; // declare `this` in that scope

    for (const method of stmt.methods) {
      // resolving the methods inside the class
      let declaration = FunctionType.Method;
      if (method.name.lexeme === "init") {
        // if its an initializer
        declaration = FunctionType.Initializer;
      }
      this.resolveFunction(method, declaration);
    }

    this.endScope();

    this.currentClass = enclosingClass; // return back to the enclosing class after done

    return;
  }

  beginScope() {
    this.scopes.push({});
  }
  endScope() {
    this.scopes.pop();
  }

  resolve(statements: Stmt[]): void;
  resolve(stmt: Stmt | Expr): void;
  resolve(target: Stmt[] | Stmt | Expr) {
    if (Array.isArray(target)) {
      for (const statement of target) {
        this.resolve(statement);
      }
    } else {
      target.accept(this);
    }
  }

  resolveLocal(expr: Expr, name: Token) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i][name.lexeme] !== undefined) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
  }

  resolveFunction(func: Function, type: FunctionType) {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;
    this.beginScope();
    func.params.forEach((param) => {
      this.declare(param);
      this.define(param);
    });
    this.resolve(func.body);
    this.endScope();
    this.currentFunction = enclosingFunction;
  }

  private declare(name: Token) {
    if (this.scopes.isEmpty()) return;
    const scope = this.scopes.peek();

    if (name.lexeme in scope) {
      Lox.error(name.line, "Already a variable with this name in this scope.");
    }

    scope[name.lexeme] = false;
  }

  private define(name: Token) {
    if (this.scopes.isEmpty()) return;
    this.scopes.peek()[name.lexeme] = true;
  }
}
