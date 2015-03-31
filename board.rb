# encoding: utf-8

require_relative 'queen.rb'
require_relative 'pawn.rb'
require_relative 'knight.rb'
require_relative 'king.rb'
require_relative 'bishop.rb'
require_relative 'rook.rb'

class Board

  def initialize
    @grid = Array.new(8) { Array.new(8) }
    place_pieces
  end

  def in_check(color)
  end

  def move(start_pos, end_pos)
    #moves piece at start_pos to end_pos
  end

  def render
    @grid.map do |row|
      row.map do |piece|
        piece.nil? ? "_" : piece.render
      end.join(' ')
    end.join("\n")
  end

  def display
    puts render
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
    @grid[0][0] = Rook.new([0][0], :black, self)
    @grid[0][7] = Rook.new([0][7], :black, self)
    @grid[7][0] = Rook.new([7][0], :white, self)
    @grid[7][7] = Rook.new([7][7], :white, self)

    #knights
    @grid[0][1] = Knight.new([0][1], :black, self)
    @grid[0][6] = Knight.new([0][6], :black, self)
    @grid[7][1] = Knight.new([7][1], :white, self)
    @grid[7][6] = Knight.new([7][6], :white, self)

    #knights
    @grid[0][2] = Bishop.new([0][2], :black, self)
    @grid[0][5] = Bishop.new([0][5], :black, self)
    @grid[7][2] = Bishop.new([7][2], :white, self)
    @grid[7][5] = Bishop.new([7][5], :white, self)

    #queens
    @grid[0][3] = Queen.new([0][3], :black, self)
    @grid[7][3] = Queen.new([7][3], :white, self)

    #kings
    @grid[0][4] = King.new([0][4], :black, self)
    @grid[7][4] = King.new([7][4], :white, self)
  end



end
