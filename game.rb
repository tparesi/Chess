require_relative 'board.rb'

class Game
  attr_accessor :board

  def initialize
    place_pieces = true
    @board = Board.new(Array.new(8){Array.new(8)}, place_pieces)
    play
  end

  def play

    until @board.checkmate?(:white) || @board.checkmate?(:black)
      @board.display
      @board.move
    end

    puts "Checkmate! :("
  end

end
