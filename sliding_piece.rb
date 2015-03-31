require_relative 'piece.rb'

class Sliding_Piece < Piece

  def moves

  end


  def move_dirs
    raise NotImplementedError.new "Subclass of sliding piece must override move_dirs."
  end

end
