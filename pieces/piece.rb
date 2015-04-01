class Piece
  attr_accessor :pos
  attr_reader :color

  def initialize(pos, color, board)
    @pos = pos
    @color = color
    @board = board
  end

  def valid_moves
    reachable_squares.reject{ |end_pos| move_into_check?(end_pos) }
  end

  def reachable_squares
    moves.select{  |pos| @board[pos].nil? || opponent?(@board[pos]) }
  end

  def inspect
    self.class.to_s
  end

  private

    def move_into_check?(end_pos)
      duped = @board.deep_dup
      duped.move(color, pos, end_pos).in_check?(color)
    end

    def opponent?(other)
      self.color != other.color
    end

    def in_bounds?(pos)
      x, y = pos
      x.between?(0, 7) && y.between?(0, 7)
    end

    def x
      pos.first
    end

    def y
      pos.last
    end
end
