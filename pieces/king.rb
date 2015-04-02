require_relative 'stepping_piece.rb'

class King < Stepping_Piece

  DX_DY = [
    [0,1],
    [0,-1],
    [1,0],
    [-1,0],
    [1,1],
    [1,-1],
    [-1,-1],
    [-1,1]
  ]

  def move_dirs
    DX_DY
  end

  def render
    color == :white ? "\u2654" : "\u265A"
  end

end
