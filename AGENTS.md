This is a **canvas-based water simulation** using vanilla ES6 modules with clean architecture. It is a prototype app used by a single user. There are no tests and no need for staying consistent with legacy code EXCEPT for the save system, which should be able to handle older save files. It contains a mess of files, often with duplicated responsibilities and functionality, because it wasn't refactored yet into it's minimal working form. DO NOT INCLUDE OBVIOUS OR TRIVIAL CHANGES IN CONVERSATION SUMMARY, AND DO NOT ADD A SUMMARY UNLESS EXPLICITLY PROMPTED BY USER.

- You should follow KISS, DRY, SOLID principles when creating the code.
- You should use typescript
- Do not use hardcoded values. Extract common parameters to appropriate files with constants/configurations.
- DO NOT CREATE DUPLICATE FUNCTIONALITY. TRY TO KEEP FILES UNDER 200 LINES OF CODE.
- REFACTOR SIMILAR CODE AS YOU GO, AND SEARCH FOR DUPLICATE SIMILAR FUNCTIONALITY IN OTHER FILES BEFORE YOU ADD IT/MOVE IT.
- THINK ABOUT PUBLIC API OF EACH MODULE AND DECOUPLE THE CODE. BE INSPIRED BY HEXAGONAL ARCHITECTURE, BUT DO NOT OVERCOMPLICATE SIMPLE CODE.
- Use HTML templates for creating elements.
- We use deno for development, however running deno server is the responsibility of the user. DO NOT try to run the server.
- Use deno for linting and formatting when necessary.
- Use modern CSS features like nesting or logical properties, and for styling system use Open Props
- Use proper semantic HTML. Stay consistent and use modern features.
- DO NOT PERFORM HUGE REFACTORS WITHOUT PROMPTING THE USER.
- Present implementation plans and rate their difficulties.
- Keep performance in mind by implementing low hanging implementation optimizations. For more advanced optimizations, ask user what is the decision.
- Prefer declarative and functional patterns.
- Avoid callback hell.
- Don't leave dead code.
- Make sure the app is interactive.
- Use `performance.mark()` and `performance.measure()`
- Keep overview and other chat comments minimal, assume the developer is experienced and doesn't need detailed 

### Basin Tree Structure - **CRITICAL CONCEPT**

- **Forest structure**: Multiple disconnected basin trees (not single tree). Deeper basins always belong to the shallower parent basin, thus parent basins are connected on the same level if reachable. A basin node in the tree is built bottom-up with parent pointers.
- **Pump references**: Each pump holds pipe system reference and operates on basin at pump location
- **Hierarchical flood-fill**: Basins computed by depth, with outlet connections to lower depths
- **Bottom-up flow**: Water flows from deeper (higher ID) to shallower (lower ID) basins. Water is pumped-out from the topmost active basin.
- **Smart diagonal blocking**: higher tiles prevent diagonal water flow (e.g., diagonal land blocks water)
- **basin ID format**: `{depth}#{letter}` (e.g., "3#A", "3#B" for multiple basins at depth 3)
- **pump ID format**: `P{pipe_system}.{pumpId}`
- **3-pass algorithm**: flood-fill → ID assignment → outlet detection