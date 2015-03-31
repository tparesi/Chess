require_relative 'board.rb'

class Game

  def initialize
    @board = Board.new
  end

  def play

    # check if game has been won
    until @board.in_check?(:black) || @board.in_check?(:white)
      @board.display
      @board.move
    end

    puts "in check"
  end

end
