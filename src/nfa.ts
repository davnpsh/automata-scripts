import { parseRegex, SyntaxTreeNode } from "./regex";
import { State, Automaton } from "./automaton";

export class NFA extends Automaton<string> {
  constructor(regex: string) {
    super(regex);
  }

  /**
   * Build the NFA from the syntax tree using Thompson's construction
   * https://en.wikipedia.org/wiki/Thompson%27s_construction
   */
  build(regex: string): [State, State] {
    function generateGraph(st_node: SyntaxTreeNode, initial_state: State) {
      let letter: string,
        next_state: State,
        last_state: State,
        last_states: Array<State>,
        prev_state: State,
        accept_state: State;

      switch (st_node.type) {
        case "empty":
          accept_state = new State(++label);

          initial_state.addNext("ϵ", accept_state);

          // Return accept state
          return accept_state;

          break;
        //
        // (initial_state) ----- a -----> (accept_state)
        case "text":
          letter = st_node.text as string;
          accept_state = new State(++label);

          initial_state.addNext(letter, accept_state);

          // Return accept state
          return accept_state;

          break;
        //
        // (initial_state) ----- ϵ -----> (next_state)...(sub-automaton)... ----- ϵ -----> (accept_state)
        case "or":
          last_states = [];

          for (let part of st_node.parts as Array<SyntaxTreeNode>) {
            next_state = new State(++label);
            initial_state.addNext("ϵ", next_state);
            // Resolve sub-automaton
            last_state = generateGraph(part, next_state) as State;
            last_states.push(last_state);
          }

          accept_state = new State(++label);

          for (let state of last_states) {
            state.addNext("ϵ", accept_state);
          }

          return accept_state;

          break;
        //
        // (initial_state) ...(sub-automaton).. ...(sub-automaton).. ... (accept_state)
        case "cat":
          prev_state = initial_state;

          for (let part of st_node.parts as Array<SyntaxTreeNode>) {
            prev_state = generateGraph(part, prev_state) as State;
          }

          return prev_state;

          break;
        //
        case "star":
        case "plus":
        case "optional":
          // (initial_state) ----- ϵ -----> (temp_initial_state)
          let temp_initial_state = new State(++label);
          initial_state.addNext("ϵ", temp_initial_state);

          // Resolve sub-automaton
          let temp_accept_state = generateGraph(
            st_node.sub as SyntaxTreeNode,
            temp_initial_state,
          ) as State;

          // Only for "star" or "plus"
          if (st_node.type == "star" || st_node.type == "plus") {
            // (temp_accept_state) ----- ϵ -----> (temp_initial_state)
            temp_accept_state.addNext("ϵ", temp_initial_state);
          }

          accept_state = new State(++label);

          // (temp_last_state) ----- ϵ -----> (accept_state)
          temp_accept_state.addNext("ϵ", accept_state);

          // Only for "star" and "optional"
          if (st_node.type == "star" || st_node.type == "optional") {
            // (initial_state) ----- ϵ -----> (accept_state)
            initial_state.addNext("ϵ", accept_state);
          }

          return accept_state;

          break;
      }
    }

    // Regex syntax tree
    const st = parseRegex(regex);

    // Global labeling
    let label = 0;

    let initial_state = new State(label),
      accept_state = generateGraph(st, initial_state) as State;

    return [initial_state, accept_state];
  }

  /**
   * Enclose the automaton with states. By default, the enclosure is done with epsilon transitions.
   */
  enclosure(T: State | State[], symbol: string = "ϵ") {
    const reacheable_states = new Set();

    // Use depth-first search algorithm
    function DFS(state: State) {
      if (reacheable_states.has(state)) return;
      reacheable_states.add(state);

      for (const edge of state.next) {
        if (edge.symbol == symbol) {
          DFS(edge.to);
        }
      }
    }

    // Check if T is an array or a single State
    if (Array.isArray(T)) {
      for (const state of T) {
        DFS(state);
      }
    } else {
      DFS(T);
    }

    return Array.from(reacheable_states);
  }
}
