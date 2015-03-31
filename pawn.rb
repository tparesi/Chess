require_relative 'piece.rb'

class Pawn < Piece

  def render
    color == :white ? "\u2659" : "\u265F"
  end

end
