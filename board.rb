Dir["./pieces/*.rb"].each {|file| require file }
require 'colorize'

class Board

  ROW = {
    "A" => 7,
    "B" => 6,
    "C" => 5,
    "D" => 4,
    "E" => 3,
    "F" => 2,
    "G" => 1,
    "H" => 0
  }

  def initialize(starting_grid, place_new_pieces)
    @grid = starting_grid
    place_pieces if place_new_pieces
  end

  def move(color, start_pos = nil, end_pos = nil)
    if start_pos.nil? && end_pos.nil?
      piece, start_pos, end_pos = human_move(color)
    else
      piece = self[start_pos]
    end
    update_board_state(piece, start_pos, end_pos)

    self
  end

  def checkmate?(color)
    if in_check?(color)
      return pieces(color).none? { |piece| piece.valid_moves.count > 0 }
    end
    false
  end

  def stalemate?(color)
    !in_check?(color) && pieces(color).none? { |piece| piece.valid_moves.count > 0 }
  end

  def in_check?(color)
    king = pieces(color).select {|piece| piece.is_a?(King)}.first

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
    grid = Array.new(8){Array.new(8)}
    new_board = Board.new(grid, false)

    @grid.each_with_index do |row, i|
      row.each_with_index do |piece, j|
        piece = @grid[i][j]
        populate_square(grid, new_board, i, j, piece)
      end
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

    def populate_square(grid, board, i, j, piece)
      if piece
        if piece.is_a?(Pawn)
          grid[i][j] = Pawn.new([i,j], piece.color, board, piece.first_move)
        else
          grid[i][j] = piece.class.new([i,j], piece.color, board)
        end
      else
        grid[i][j] = nil
      end
    end

    def opponent(color)
      color == :white ? :black : :white
    end

    def human_move(color)
      begin
        start_pos, end_pos = get_move
        piece = self[start_pos]

        handle_invalid_inputs(piece, end_pos, color)
      rescue IOError => e
        puts e.message
        retry
      end

      [piece, start_pos, end_pos]
    end

    def get_move
      puts "Where do you want to move from?"
      coords = gets.chomp.split("")
      start_pos = [ROW[coords.first.upcase], coords.last.to_i - 1]

      puts "Where do you want to move to?"
      coords = gets.chomp.split("")
      end_pos = [ROW[coords.first.upcase], coords.last.to_i - 1]

      [start_pos, end_pos]
    end

    def handle_invalid_inputs(piece, end_pos, player_color)
      raise IOError.new "There's no piece there!\n" unless piece

      unless piece.valid_moves.include?(end_pos)
        raise IOError.new "That's not a valid move for the piece you chose.\n"
      end

      unless piece.color == player_color
        raise IOError.new "That's your opponent's piece.\n"
      end
    end

    def all_pieces
      @grid.flatten.reject { |piece| piece.nil? }
    end

    def pieces(color)
      all_pieces.select { |piece| piece.color == color }
    end

    def place_pieces

      # pawns
      @grid[1].each_with_index do |square, index|
          @grid[1][index] = Pawn.new([1,index], :black, self)
      end
      @grid[6].each_with_index do |square, index|
          @grid[6][index] = Pawn.new([6,index], :white, self)
      end

      #rooks
      @grid[0][0] = Rook.new([0, 0], :black, self)
      @grid[0][7] = Rook.new([0, 7], :black, self)
      @grid[7][0] = Rook.new([7, 0], :white, self)
      @grid[7][7] = Rook.new([7, 7], :white, self)

      #knights
      @grid[0][1] = Knight.new([0, 1], :black, self)
      @grid[0][6] = Knight.new([0, 6], :black, self)
      @grid[7][1] = Knight.new([7, 1], :white, self)
      @grid[7][6] = Knight.new([7, 6], :white, self)

      #knights
      @grid[0][2] = Bishop.new([0, 2], :black, self)
      @grid[0][5] = Bishop.new([0, 5], :black, self)
      @grid[7][2] = Bishop.new([7, 2], :white, self)
      @grid[7][5] = Bishop.new([7, 5], :white, self)

      #queens
      @grid[0][3] = Queen.new([0, 3], :black, self)
      @grid[7][3] = Queen.new([7, 3], :white, self)

      #kings
      @grid[0][4] = King.new([0, 4], :black, self)
      @grid[7][4] = King.new([7, 4], :white, self)
    end

    def render
      characters = "HGFEDCBA".chars
      background = :gray

      "   " + (1..8).to_a.join("  ") + "\n" +
      @grid.map do |row|
        background == :white ? background = :gray : background = :white

        (characters.shift + " ") + row.map do |piece|
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
