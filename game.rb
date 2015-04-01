require_relative 'board.rb'
require_relative 'human_player.rb'

class Game
  attr_accessor :board

  def initialize(player1, player2)
    @player1, @player2 = player1, player2
    place_pieces = true
    @board = Board.new(Array.new(8){Array.new(8)}, place_pieces)
    play
  end

  def play
    player = @player1

    until ended_in_checkmate?|| ended_in_stalemate?
      puts "\n#{player.name.capitalize}'s turn."
      @board.display
      @board.move(player.color)
      player == @player1 ? player = @player2 : player = @player1
    end

    @board.display
    display_winner(player)
  end

  def display_winner(player)
    if ended_in_checkmate?
      puts "\nCheckmate! #{player.name.capitalize} loses."
    elsif ended_in_stalemate?
      puts "\nStalemate! Nobody wins."
    end
  end

  def ended_in_stalemate?
    @board.stalemate?(:white) || @board.stalemate?(:black)
  end

  def ended_in_checkmate?
    @board.checkmate?(:white) || @board.checkmate?(:black)
  end

end

if __FILE__ == $PROGRAM_NAME
  puts "Who is playing white?"
  name = gets.chomp
  player1 = HumanPlayer.new(name, :white)

  puts "Who is playing black?"
  name = gets.chomp
  player2 = HumanPlayer.new(name, :black)

  Game.new(player1, player2)
end
