This is a **canvas-based water simulation** using vanilla ES6 modules. It is a prototype app used by a single user. There are no tests and no need for staying consistent with legacy code EXCPT for the save system, which should be able to handle older save files.

- You should follow DRY and SOLID principles when creating the code.
- You should use typescript in JSDoc comments.
- Do not use hardcoded values. Extract common parameters to appropriate files with constants/configurations.
- We use deno for development, however running deno server is the responsibility of the user. DO NOT try to run the server.
- Use deno for linting and formatting when necessary.
- For CSS use mdoern features like nesting or logical properties, and for styling system use Open Props
- Use proper semantic HTML. Stay consistent and use modern features.
- DO NOT PERFORM HUGE REFACTORS WITHOUT PROMPTING THE USER.
- Present implementation plans and rate their difficulties.
- Keep performance in mind by implementing low hanging implementation optimizations. For more advanced optimizations, ask user what is the decision.
- Prefer declarative and functional patterns.
- Avoid callback hell.
- Don't leave dead code.
- Make sure the app is interactive.
- Use `performance.mark()` and `performance.measure()`

### Basin Tree Structure - **CRITICAL CONCEPT**

- **Forest structure**: Multiple disconnected basin trees (not single tree). Deeper basins always belong to the shallower parent basin, thus parent basins are connected on the same level if reachable.
- **Bottom-up flow**: Water flows from deeper (higher ID) to shallower (lower ID) basins. Water is pumped-out from the topmost active basin.
- **Pump references**: Each pump holds pipe system reference and operates on basin at pump location
- **Hierarchical flood-fill**: Basins computed by depth, with outlet connections to lower depths
- **Smart diagonal blocking**: higher tiles prevent diagonal water flow (e.g diagonal land blocks water)
- **basin ID format**: `{depth}#{letter}` (e.g., "3#A", "3#B" for multiple basins at depth 3)
- **pump ID format**: `P{pipe_system}.{pumpId}`
- **3-pass algorithm**: flood-fill → ID assignment → outlet detection