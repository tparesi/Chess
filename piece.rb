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

  ## NOT COMPLETED
  def valid_moves
    possible_moves
  end

  def move_into_check?(pos)
    # dup the board
    duped = @board.deep_dup
    # make the move on duped board
    # return duped_board.in_check?(color)
  end

  require 'byebug'
  def possible_moves
    byebug
    moves.select{ |pos| @board[pos].nil? || opponent?(@board[pos]) }
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
