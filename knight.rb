require_relative 'stepping_piece.rb'

class Knight < Stepping_Piece

  DX_DY = [
    [-2,-1],
    [-2,1],
    [-1,-2],
    [-1,2],
    [1,-2],
    [1,2],
    [2,-1],
    [2,1]
  ]

  def move_dirs
    DX_DY
  end

  def render
    color == :white ? "\u2658" : "\u265E"
  end

end
