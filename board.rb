# encoding: utf-8

require_relative 'queen.rb'
require_relative 'pawn.rb'
require_relative 'knight.rb'
require_relative 'king.rb'
require_relative 'bishop.rb'
require_relative 'rook.rb'
require 'colorize'

require 'byebug'

class Board

  ROW = {
    "A" => 0,
    "B" => 1,
    "C" => 2,
    "D" => 3,
    "E" => 4,
    "F" => 5,
    "G" => 6,
    "H" => 7
  }

  def initialize(starting_grid, place_new_pieces)
    @grid = starting_grid
    place_pieces if place_new_pieces
  end

  def move(start_pos = nil, end_pos = nil)
    if start_pos.nil? && end_pos.nil?
      piece, start_pos, end_pos = human_move
    else
      piece = self[start_pos]
    end

    piece.pos = end_pos
    self[end_pos] = piece
    self[start_pos] = nil
    piece.first_move = false if piece.is_a?(Pawn)
    self
  end

  def human_move
    begin
      start_pos, end_pos = get_move
      piece = self[start_pos]

      handle_invalid_inputs(piece, end_pos)
    rescue IOError => e
      puts e.message
      retry
    end

    [piece, start_pos, end_pos]
  end

  def in_check?(color)
    king = pieces(color).select {|piece| piece.is_a?(King)}.first

    pieces(opponent(color)).any? do |opponent|
      opponent.possible_moves.include?(king.pos)
    end
  end

  def opponent(color)
    color == :white ? :black : :white
  end

  def all_pieces
    @grid.flatten.reject { |piece| piece.nil? }
  end

  def pieces(color)
    all_pieces.select { |piece| piece.color == color }
  end

  def [](pos)
    @grid[pos.first][pos.last]
  end

  def []=(pos, value)
    @grid[pos.first][pos.last] = value
  end

  def get_move
    puts "Where do you want to move from?"
    coords = gets.chomp.split("")
    start_pos = [ROW[coords.first.upcase], coords.last.to_i]

    puts "Where do you want to move to?"
    coords = gets.chomp.split("")
    end_pos = [ROW[coords.first.upcase], coords.last.to_i]

    [start_pos, end_pos]
  end

  def handle_invalid_inputs(piece, end_pos)
    raise IOError.new "That's an empty space!" unless piece

    unless piece.valid_moves.include?(end_pos)
      raise IOError.new "You can't move there."
    end

    # Chose piece that is opponent's piece
  end

  def display
    puts render
  end

  def render
    characters = "ABCDEFGH".chars
    background = :gray

    "   " + (0..7).to_a.join("  ") + "\n" +
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

  def inspect
    display
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

  def deep_dup
    grid = Array.new(8){Array.new(8)}
    new_board = Board.new(grid, false)


    @grid.each_with_index do |row, i|
      row.each_with_index do |piece, j|
        piece = @grid[i][j]

        if piece
          if piece.is_a?(Pawn)
            grid[i][j] = Pawn.new([i,j], piece.color, new_board, piece.first_move)
          else
            grid[i][j] = piece.class.new([i,j], piece.color, new_board)
          end
        else
          grid[i][j] = nil
        end
      end
    end

    new_board
  end

end
