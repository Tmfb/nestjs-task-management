import { Injectable } from '@nestjs/common';
import { User } from '../auth/user.entity';
import { Result, ResultStates } from '../result.dto';
import { DataSource, Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project } from './project.entity';
import { GetProjectsFilterDto } from './dto/get-projects-filter.dto';
import { HttpStatus } from '@nestjs/common/enums';

@Injectable()
export class ProjectsRepository extends Repository<Project> {
  constructor(private dataSource: DataSource) {
    super(Project, dataSource.createEntityManager());
  }

  async createProject(
    createProjectDto: CreateProjectDto,
    user: User,
  ): Promise<Result> {
    const { title, description } = createProjectDto;
    const project: Project = this.create({
      title: title,
      description: description,
      admin: user,
      members: [user],
      tasks: [],
    });

    try {
      this.save(project);
    } catch (error) {
      return new Result(ResultStates.ERROR, {
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return new Result(ResultStates.OK, project);
  }

  async getProjects(
    filterDto: GetProjectsFilterDto,
    user: User,
  ): Promise<Result> {
    const { search } = filterDto;
    const query = this.createQueryBuilder('project');
    query.where('project.admin = :adminId ', { adminId: user.id });

    if (search) {
      query.andWhere(
        'LOWER(project.title) LIKE LOWER(:search) OR LOWER(project.description) LIKE LOWER(:search)',
        { search: search },
      );
    }

    let projects = [];
    try {
      projects = await query.getMany();
    } catch (error) {
      return new Result(ResultStates.ERROR, {
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return new Result(ResultStates.OK, projects);
  }

  async getProjectById(id: string, user: User): Promise<Result> {
    let project: Project;

    try {
      project = await this.findOne({
        where: [{ id: id }],
        relations: { admin: true, tasks: true, members: true },
      });
    } catch (error) {
      return new Result(ResultStates.ERROR, {
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    if (
      !project ||
      project.members.some((member) => {
        return member == user;
      })
    ) {
      return new Result(ResultStates.ERROR, {
        message: `Project with id ${id} not found or you are not a member`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return new Result(ResultStates.OK, project);
  }

  async deleteProject(id: string, user: User): Promise<Result> {
    let removed;
    try {
      removed = await this.delete({ id: id, admin: user });
    } catch (error) {
      return new Result(ResultStates.ERROR, {
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    if (removed.affected == 0) {
      return new Result(ResultStates.ERROR, {
        message: `Project with id ${id} not found`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    return new Result(ResultStates.OK);
  }
}
