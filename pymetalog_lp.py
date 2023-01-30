import pandas as pd
import numpy as np
import json

def main():
    with open("fixture.json", "r") as f:
        fixtures = json.load(f)
        term_limit = 8
        fixture = fixtures[0]
        terms = fixture["terms"][0]
        print(terms)
        y = np.array(fixture["cdf_y"])
        print(y)
        Y = pd.DataFrame()
        Y["y1"] = np.ones(len(fixture["cdf_y"]))
        Y["y2"] = np.log(y / (1 - y))
        Y["y3"] = (y - 0.5) * Y["y2"]

        if term_limit > 3:
            Y["y4"] = y - 0.5

        # Complete the values through the term limit
        if term_limit > 4:
            for i in range(5, term_limit + 2):
                yn = "y" + str(i)

                if i % 2 != 0:
                    Y[yn] = Y["y4"] ** (int(i // 2))

                if i % 2 == 0:
                    zn = "y" + str(i - 1)
                    Y[yn] = Y["y2"] * Y[zn]

        m_dict = {
            "Y": Y,
            "dataValues": {
                "z": fixture["cdf_x"],
            }
        }
        a_vector_LP(m_dict, terms) 

def diffMatMetalog(term_limit, step_len):
    """TODO: write docstring"""
    y = np.arange(step_len, 1, step_len)
    Diff = np.array([])

    for i in range(0, (len(y))):
        d = y[i] * (1 - y[i])
        f = y[i] - 0.5
        l = np.log(y[i] / (1 - y[i]))

        # Initiate pdf
        diffVector = 0

        # For the first three terms
        x = 1 / d
        diffVector = [diffVector, x]

        if term_limit > 2:
            diffVector.append((f / d) + l)

        # For the fourth term
        if term_limit > 3:
            diffVector.append(1)

        # Initalize some counting variables
        e = 1
        o = 1

        # For all other terms greater than 4
        if term_limit > 4:
            for i in range(5, (term_limit + 1)):
                if (i % 2) != 0:
                    # iff odd
                    diffVector.append((o + 1) * f ** o)
                    o = o + 1

                if (i % 2) == 0:
                    # iff even
                    diffVector.append(((f ** (e + 1)) / d) + (e + 1) * (f ** e) * l)
                    e = e + 1
        if np.size(Diff) == 0:
            Diff = diffVector
        else:
            Diff = np.vstack((Diff, diffVector))

    Diff_neg = -1 * (Diff)
    new_Diff = np.hstack((Diff[:, [0]], Diff_neg[:, [0]]))

    for c in range(1, (len(Diff[1, :]))):
        new_Diff = np.hstack((new_Diff, Diff[:, [c]]))
        new_Diff = np.hstack((new_Diff, Diff_neg[:, [c]]))

    new_Diff = pd.DataFrame(data=new_Diff)

    return new_Diff

def a_vector_LP(
    m_dict, terms, diff_error=0.001, diff_step=0.001
):
    """TODO: write docstring"""
    cnames = np.array([])

    i = terms
    Y = m_dict["Y"].iloc[:, 0:i]
    z = m_dict["dataValues"]["z"]

    # Bulding the objective function using abs value LP formulation
    Y_neg = -Y

    new_Y = pd.DataFrame({"y1": Y.iloc[:, 0], "y1_neg": Y_neg.iloc[:, 0]})

    for c in range(1, len(Y.iloc[0, :])):
        new_Y["y" + str(c + 1)] = Y.iloc[:, c]
        new_Y["y" + str(c + 1) + "_neg"] = Y_neg.iloc[:, c]

    a = np.array(["".join(["a", str(i)])])
    cnames = np.append(cnames, a, axis=0)

    # Building the constraint matrix
    error_mat = np.array([])

    for j in range(1, len(Y.iloc[:, 0]) + 1):
        front_zeros = np.zeros(2 * (j - 1))
        ones = [1, -1]
        trail_zeroes = np.zeros(2 * (len(Y.iloc[:, 1]) - j))
        if j == 1:
            error_vars = np.append(ones, trail_zeroes)

        elif j != 1:
            error_vars = np.append(front_zeros, ones)
            error_vars = np.append(error_vars, trail_zeroes)

        if error_mat.size == 0:
            error_mat = np.append(error_mat, error_vars, axis=0)
        else:
            error_mat = np.vstack((error_mat, error_vars))

    new = pd.concat((pd.DataFrame(data=error_mat), new_Y), axis=1)
    diff_mat = diffMatMetalog(i, diff_step)
    diff_zeros = []

    for t in range(0, len(diff_mat.iloc[:, 0])):
        zeros_temp = np.zeros(2 * len(Y.iloc[:, 0]))

        if np.size(diff_zeros) == 0:
            diff_zeros = zeros_temp
        else:
            diff_zeros = np.vstack((zeros_temp, diff_zeros))

    diff_mat = np.concatenate((diff_zeros, diff_mat), axis=1)
    np.savetxt("A_eq.csv", new, delimiter=",")
    np.savetxt("A_ub.csv", diff_mat, delimiter=",")

    # Combine the total constraint matrix
    lp_mat = np.concatenate((new, diff_mat), axis=0)

    # Objective function coeficients
    c = np.append(np.ones(2 * len(Y.iloc[:, 1])), np.zeros(2 * i))

    # Constraint matrices
    A_eq = lp_mat[: len(Y.iloc[:, 1]), :]
    A_ub = -1 * lp_mat[len(Y.iloc[:, 1]) :, :]
    b_eq = z
    b_ub = -1 * np.repeat(diff_error, len(diff_mat[:, 0]))

    # Solving the linear program w/ scipy (for now)
#        lp_sol = linprog(
#            c,
#            A_ub=A_ub,
#            b_ub=b_ub,
#            A_eq=A_eq,
#            b_eq=b_eq,
#            method="simplex",
#            options={"maxiter": 5000, "tol": 1.0e-5, "disp": False},
#        )

    # Consolidating solution back into the a vector
#        tempLP = lp_sol.x[(2 * len(Y.iloc[:, 1])) : (len(lp_sol.x) + 1)]
#        temp = []

#        for r in range(0, ((len(tempLP) // 2))):
#            temp.append(tempLP[(r * 2)] - tempLP[(2 * r) + 1])

    return []

main()
