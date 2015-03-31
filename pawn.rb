require_relative 'piece.rb'

class Pawn < Piece

  def moves
    [[pos.first + dy, pos.last]]
  end

  def dy
    color == :white ? -1 : 1
  end

  def render
    color == :white ? "\u2659" : "\u265F"
  end

end
