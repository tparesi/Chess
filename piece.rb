class Piece
  attr_accessor :pos
  attr_reader :color

  def initialize(pos, color, board)
    @pos = pos
    @color = color
    @board = board
  end

  def moves
    # returns array of valid moves
    # filters only valid moves(within bounds and opponent)
  end


end
