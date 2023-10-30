export enum Move {
  Null,
  Rock,
  Paper,
  Scissors,
  Spock,
  Lizard,
}
export enum GameResult {
  Tie,
  P1,
  P2,
}

export function determineGameResult(p1_move: Number, p2_move: Number): Number {
  console.log("calculatin result for p1_move: ", p1_move);
  console.log("calculatin result for p2_move: ", p2_move);
  console.log(
    `type of p1_move is ${typeof p1_move} & type of p2_move is ${typeof p2_move}`
  );
  if (p1_move === p2_move) {
    return GameResult.Tie;
  }

  if (
    (p1_move === Move.Rock &&
      (p2_move === Move.Scissors || p2_move === Move.Lizard)) ||
    (p1_move === Move.Paper &&
      (p2_move === Move.Rock || p2_move === Move.Spock)) ||
    (p1_move === Move.Scissors &&
      (p2_move === Move.Paper || p2_move === Move.Lizard)) ||
    (p1_move === Move.Spock &&
      (p2_move === Move.Rock || p2_move === Move.Scissors)) ||
    (p1_move === Move.Lizard &&
      (p2_move === Move.Spock || p2_move === Move.Paper))
  ) {
    return GameResult.P1; // Player 1 wins
  } else {
    return GameResult.P2; // Player 2 wins
  }
}
