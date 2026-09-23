# PROJECT CODE QUALITY RULES (MAJBURIY)

1. Prefer existing code over creating wrappers.
2. Do not create compatibility aliases unless external data/API requires them.
3. Do not re-export another store's state or methods through a different store.
4. Do not keep old names just to avoid updating callers.
5. One responsibility must have one owner.
6. One piece of state must have one source of truth.
7. Do not duplicate the same data in multiple objects.
8. Do not create abstractions for one simple function.
9. Do not create Manager/Service/Helper classes unless there is real reusable domain logic.
10. Remove dead code instead of commenting it out.
11. Never use `any`, `@ts-ignore`, or eslint-disable to hide architectural problems.
12. When moving functionality, update all callers instead of creating a bridge.
13. Do not preserve internal APIs merely for backward compatibility.
14. Before adding code, search whether an existing function already solves the problem.
15. Prefer direct dependencies over indirection.
16. Keep stores focused on one domain.
17. Components should use the store that owns the data directly.
18. Do not create a second source of truth.
19. Do not make a refactor larger than necessary.
20. After refactoring, remove obsolete code and verify repository-wide usage.
