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

  require 'byebug'

  def valid_moves
    possible_moves.reject{ |end_pos| move_into_check?(end_pos) }
  end

  def move_into_check?(end_pos)
    duped = @board.deep_dup
    duped.move(pos, end_pos).in_check?(color)
  end

  def opponent?(other)
    self.color != other.color
  end

  def possible_moves
    moves.select{  |pos| @board[pos].nil? || opponent?(@board[pos]) }
  end

  def in_bounds?(pos)
    x, y = pos
    x.between?(0, 7) && y.between?(0, 7)
  end

  def inspect
    self.class.to_s
  end

  def deep_dup(board)
    self.class.new(pos, color, board)
  end

end
