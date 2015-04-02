require_relative 'player.rb'

class ComputerPlayer < Player

  def generate_move(board)
    moveable_pieces = board.pieces(color).select{|p| p.valid_moves.count > 0}

    attack = attacking_move(moveable_pieces, board)
    if attack
      return attack
    else
      return random_move(moveable_pieces)
    end
  end

  def attacking_move(moveable_pieces, board)
    opponent_locs = board.pieces(opponent(color)).map{|piece| piece.pos}

    moveable_pieces.each do |piece|
      opponent_locs.each do |op_loc|
        if piece.valid_moves.include?(op_loc)
          return [piece.pos, op_loc]
        end
      end
    end
    nil
  end

  def random_move(moveable_pieces)
    piece = moveable_pieces.sample
    end_pos = piece.valid_moves.sample

    [piece.pos, end_pos]
  end

  def opponent(color)
    color == :white ? :black : :white
  end

end
