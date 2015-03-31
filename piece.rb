class Piece
  attr_accessor :pos
  attr_reader :color

  def initialize(pos, color, board)
    @pos = pos
    @color = color
    @board = board
  end

  def moves
    raise NotImplementedError
  end

  def x
    pos.first
  end

  def y
    pos.last
  end

  def opponent?(other)
    color != other.color
  end

  require 'byebug'
  def valid_moves
    moves.select{ |pos| @board[pos].nil? || opponent?(@board[pos]) }
  end

  def in_bounds?(pos)
    x, y = pos
    x.between?(0, 7) && y.between?(0, 7)
  end

  def inspect
    pos
  end

end
