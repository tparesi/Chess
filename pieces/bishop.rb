require_relative 'sliding_piece.rb'

class Bishop < Sliding_Piece

  DIRECTIONS = [
    [1,1],
    [1,-1],
    [-1,1],
    [-1,-1]
  ]

  def move_dirs
    DIRECTIONS
  end

  def render
    color == :white ? "\u2657" : "\u265D"
  end

end
