Dir["./pieces/*.rb"].each {|file| require file }
require 'colorize'

class Board

  PIECES = [Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook]

  def initialize(place_new_pieces = true)
    @grid = Array.new(8){Array.new(8)}
    place_pieces if place_new_pieces
  end

  def move(color, start_pos, end_pos)
    piece = self[start_pos]
    update_board_state(piece, start_pos, end_pos)

    self
  end

  def checkmate?(color)
    return false if !in_check?(color)
    pieces(color).none? { |piece| piece.valid_moves.count > 0 }
  end

  def stalemate?(color)
    !in_check?(color) && pieces(color).none? { |piece| piece.valid_moves.count > 0 }
  end

  def in_check?(color)
    king = pieces(color).find { |piece| piece.is_a?(King) }

    pieces(opponent(color)).any? do |opponent|
      opponent.reachable_squares.include?(king.pos)
    end
  end

  def [](pos)
    @grid[pos.first][pos.last]
  end

  def []=(pos, value)
    @grid[pos.first][pos.last] = value
  end

  def display
    puts render
  end

  def deep_dup
    new_board = Board.new(false)

    all_pieces.each do |piece|
      populate_square(new_board, piece)
    end

    new_board
  end

  private

    def update_board_state(piece, start_pos, end_pos)
      piece.pos = end_pos
      self[end_pos] = piece
      self[start_pos] = nil
      piece.first_move = false if piece.is_a?(Pawn)
    end

    def populate_square(board, piece)
      if piece.is_a?(Pawn)
        board[piece.pos] = Pawn.new(piece.pos, piece.color, board, piece.first_move)
      else
        board[piece.pos]= piece.class.new(piece.pos, piece.color, board)
      end
    end

    def opponent(color)
      color == :white ? :black : :white
    end

    def all_pieces
      @grid.flatten.compact
    end

    def pieces(color)
      all_pieces.select { |piece| piece.color == color }
    end

    def populate_row(row, color)
      PIECES.each_with_index do |piece, index|
        self[[row,index]] = piece.new([row, index], color, self)
      end
    end

    def place_pieces
      @grid[1].each_with_index do |square, index|
          @grid[1][index] = Pawn.new([1,index], :black, self)
      end
      @grid[6].each_with_index do |square, index|
          @grid[6][index] = Pawn.new([6,index], :white, self)
      end

      populate_row(0, :black)
      populate_row(7, :white)
    end

    def render
      background = :gray
      nums = ("1".."8").to_a

      "   " + ('a'..'h').to_a.join("  ") + "\n" +
      @grid.map do |row|
        background == :white ? background = :gray : background = :white

        (nums.shift + " ") + row.map do |piece|
          background == :white ? background = :gray : background = :white

          if piece.nil?
            ("   ").colorize(:background => background)
          else
            (' ' + piece.render + ' ').colorize(:background => background)
          end

        end.join("")
      end.join("\n")
    end

end
