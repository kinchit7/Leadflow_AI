import type { Rule } from 'eslint';
import type {
  CallExpression,
  IfStatement,
  Node,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunctionExpression
} from 'estree';

type FunctionNode = FunctionDeclaration | FunctionExpression | ArrowFunctionExpression;

interface FunctionScope {
  useScrollRef: string | null;
  useScrollNode: Node | null;
  earlyReturns: Node[];
  attachedRefs: Set<string>;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent early returns before rendering a ref used with useScroll, prevent conditional useScroll arguments, and detect unattached refs',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: undefined,
    schema: [],
    messages: {
      earlyReturnBeforeScrollRef:
        'Early return breaks useScroll({ target: {{refName}} }) - ref never attaches to DOM.\n' +
        'Error: "Target ref is defined but not hydrated"\n\n' +
        'FIX: Remove early return, keep ref container in main return, move conditional inside:\n' +
        'BEFORE (broken):\n' +
        '  if (isLoading) return <Spinner />;\n' +
        '  return <div ref={{{{refName}}}}>...</div>;\n\n' +
        'AFTER (fixed):\n' +
        '  return <div ref={{{{refName}}}}>{isLoading ? <Spinner /> : <Content />}</div>;',
      conditionalUseScrollArgument:
        'Do not pass a conditional expression to useScroll(). This causes animation issues.\n' +
        'Error: "Target ref is defined but not hydrated" or animations not working.\n\n' +
        'BEFORE (broken):\n' +
        '  useScroll(isMounted ? { target: ref } : undefined)\n\n' +
        'AFTER (fixed):\n' +
        '  useScroll({ target: ref, offset: [...] })\n\n' +
        'Framer Motion handles null refs internally - no condition needed.',
      conditionalTargetInUseScroll:
        'Do not use conditional target in useScroll(). This causes animation issues.\n' +
        'Error: Animations may not work correctly.\n\n' +
        'BEFORE (broken):\n' +
        '  useScroll({ target: isMounted ? ref : undefined })\n\n' +
        'AFTER (fixed):\n' +
        '  useScroll({ target: ref, offset: [...] })\n\n' +
        'Framer Motion handles null refs internally - no condition needed.',
      unattachedScrollRef:
        'Ref "{{refName}}" is passed to useScroll() but never attached to any DOM element.\n' +
        'Error: "Target ref is defined but not hydrated"\n\n' +
        'FIX: Add ref={{{{refName}}}} to the element you want to track scroll on:\n' +
        'BEFORE (broken):\n' +
        '  const {{refName}} = useRef(null);\n' +
        '  useScroll({ target: {{refName}} });\n' +
        '  return <section>...</section>;\n\n' +
        'AFTER (fixed):\n' +
        '  const {{refName}} = useRef(null);\n' +
        '  useScroll({ target: {{refName}} });\n' +
        '  return <section ref={{{{refName}}}}>...</section>;',
    },
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    // Track per-function scope to avoid false positives from nested functions
    const functionScopes: Map<FunctionNode, FunctionScope> = new Map();
    let currentFunctionStack: FunctionNode[] = [];

    const getCurrentFunction = () => currentFunctionStack[currentFunctionStack.length - 1];

    const enterFunction = (node: FunctionNode) => {
      currentFunctionStack.push(node);
      functionScopes.set(node, { 
        useScrollRef: null, 
        useScrollNode: null,
        earlyReturns: [],
        attachedRefs: new Set()
      });
    };

    const exitFunction = (node: FunctionNode) => {
      const scope = functionScopes.get(node);
      
      // Check for unattached scroll refs when exiting a function
      if (scope && scope.useScrollRef && scope.useScrollNode) {
        if (!scope.attachedRefs.has(scope.useScrollRef)) {
          context.report({
            node: scope.useScrollNode,
            messageId: 'unattachedScrollRef',
            data: {
              refName: scope.useScrollRef,
            },
          });
        }
      }
      
      currentFunctionStack.pop();
    };

    return {
      // Track function scope entry
      FunctionDeclaration(node) { enterFunction(node as FunctionNode); },
      FunctionExpression(node) { enterFunction(node as FunctionNode); },
      ArrowFunctionExpression(node) { enterFunction(node as FunctionNode); },

      // Track function scope exit - check for unattached refs
      'FunctionDeclaration:exit'(node) { exitFunction(node as FunctionNode); },
      'FunctionExpression:exit'(node) { exitFunction(node as FunctionNode); },
      'ArrowFunctionExpression:exit'(node) { exitFunction(node as FunctionNode); },

      // Track refs attached in JSX: <div ref={someRef}>
      JSXAttribute(node: Node) {
        const currentFn = getCurrentFunction();
        if (!currentFn) return;

        // Cast to access JSX-specific properties
        const jsxNode = node as Node & { 
          name?: { type?: string; name?: string }; 
          value?: { type?: string; expression?: { type?: string; name?: string } } 
        };

        // Check if this is a ref attribute: ref={someRef}
        if (
          jsxNode.name?.type === 'JSXIdentifier' &&
          jsxNode.name?.name === 'ref' &&
          jsxNode.value?.type === 'JSXExpressionContainer' &&
          jsxNode.value?.expression?.type === 'Identifier' &&
          jsxNode.value?.expression?.name
        ) {
          const scope = functionScopes.get(currentFn);
          if (scope) {
            scope.attachedRefs.add(jsxNode.value.expression.name);
          }
        }
      },

      // Track refs used with useScroll({ target: someRef }) and detect problematic patterns
      CallExpression(node: CallExpression) {
        const currentFn = getCurrentFunction();
        if (!currentFn) return;

        // Check if this is a useScroll call
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'useScroll'
        ) {
          // Pattern 1: useScroll(condition ? {...} : undefined)
          // Detect conditional expression as the argument
          if (
            node.arguments.length > 0 &&
            node.arguments[0].type === 'ConditionalExpression'
          ) {
            context.report({
              node: node,
              messageId: 'conditionalUseScrollArgument',
            });
            return;
          }

          // Pattern 2: useScroll({ target: condition ? ref : undefined })
          // Detect conditional target property
          if (
            node.arguments.length > 0 &&
            node.arguments[0].type === 'ObjectExpression'
          ) {
            const targetProp = node.arguments[0].properties.find(
              (prop) =>
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                prop.key.name === 'target'
            );

            if (
              targetProp &&
              targetProp.type === 'Property' &&
              targetProp.value.type === 'ConditionalExpression'
            ) {
              context.report({
                node: node,
                messageId: 'conditionalTargetInUseScroll',
              });
              return;
            }

            // Track the ref for early return detection and unattached ref detection
            if (
              targetProp &&
              targetProp.type === 'Property' &&
              targetProp.value.type === 'Identifier'
            ) {
              const scope = functionScopes.get(currentFn);
              if (scope) {
                scope.useScrollRef = targetProp.value.name;
                scope.useScrollNode = node;
              }
            }
          }
        }
      },

      // Detect early returns like: if (isLoading) return <...>
      IfStatement(node: IfStatement) {
        const currentFn = getCurrentFunction();
        if (!currentFn) return;

        const scope = functionScopes.get(currentFn);
        if (!scope || !scope.useScrollRef) return;

        const hasReturn =
          node.consequent.type === 'ReturnStatement' ||
          (node.consequent.type === 'BlockStatement' &&
            node.consequent.body.some((stmt) => stmt.type === 'ReturnStatement'));

        if (hasReturn) {
          scope.earlyReturns.push(node);
        }
      },

      // Helper to report early returns for a component function
      ...(() => {
        const reportEarlyReturns = (node: FunctionNode) => {
          const scope = functionScopes.get(node);
          if (scope && scope.useScrollRef && scope.earlyReturns.length > 0) {
            scope.earlyReturns.forEach((returnNode) => {
              context.report({
                node: returnNode,
                messageId: 'earlyReturnBeforeScrollRef',
                data: {
                  refName: scope.useScrollRef,
                },
              });
            });
          }
        };

        return {
          // export default function Component() { ... }
          'ExportDefaultDeclaration > FunctionDeclaration:exit'(node: FunctionNode) {
            reportEarlyReturns(node);
          },
          // export default () => { ... }
          'ExportDefaultDeclaration > ArrowFunctionExpression:exit'(node: FunctionNode) {
            reportEarlyReturns(node);
          },
          // const Component = () => { ... } (PascalCase = likely a component)
          'VariableDeclarator > ArrowFunctionExpression:exit'(node: FunctionNode) {
            const parent = (node as unknown as { parent?: { id?: { name?: string } } }).parent;
            const varName = parent?.id?.name;
            // Only check PascalCase names (likely React components)
            if (varName && /^[A-Z]/.test(varName)) {
              reportEarlyReturns(node);
            }
          },
          // const Component = function() { ... }
          'VariableDeclarator > FunctionExpression:exit'(node: FunctionNode) {
            const parent = (node as unknown as { parent?: { id?: { name?: string } } }).parent;
            const varName = parent?.id?.name;
            if (varName && /^[A-Z]/.test(varName)) {
              reportEarlyReturns(node);
            }
          },
        };
      })(),

      // Reset for next file
      'Program:exit'() {
        functionScopes.clear();
        currentFunctionStack = [];
      },
    };
  },
};

