import { Visitor, Expr, Binary, Grouping, Literal, Unary } from "./ast";
import { Token, TokenType } from "./token";

export class AstPrinter implements Visitor<string> {
  visitBinaryExpr(expr: Binary) {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitGroupingExpr(expr: Grouping) {
    return this.parenthesize("group", expr.expresion);
  }

  visitLiteralExpr(expr: Literal) {
    if (expr.value === null) return "nil";
    return expr.value.toString();
  }

  visitUnaryExpr(expr: Unary) {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  print(expr: Expr) {
    return expr.accept(this);
  }

  private parenthesize(name: string, ...exprs: Expr[]) {
    let output = `(${name}`;
    exprs.forEach((expr) => {
      output += ` ${expr.accept(this)}`;
    });
    return output + ")";
  }
}

// function main() {
//   const expression = new Binary(
//     new Unary(new Token(TokenType.MINUS, "-", null, 1), new Literal(123)),
//     new Token(TokenType.STAR, "*", null, 1),
//     new Grouping(new Literal(45.67))
//   );

//   console.log(new AstPrinter().print(expression));
// }

// main();
