{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  name="pymetalog";
  buildInputs = with pkgs; [(python3.withPackages (p: with p; [pandas numpy]))];
}
